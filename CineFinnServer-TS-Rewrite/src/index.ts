import path from 'path';
import fs from 'fs';
import http from 'http';
import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import https from 'https';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Database } from '@jodu555/mysqlapi';
import { User, SettingsObject } from './types/session';
dotenv.config();

const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
database.connect();

import { CommandManager } from '@jodu555/commandmanager';
CommandManager.createCommandManager(process.stdin, process.stdout);
import { registerCommands } from './utils/commands';
registerCommands();

import { ErrorHelper, AuthenticationHelper } from '@jodu555/express-helpers';
import databaseSetupFunction from './utils/database';
databaseSetupFunction();

import { initialize as socket_initialize } from './sockets';

import { getSeries, setIO, setAuthHelper } from './utils/utils';
import { compareSettings, defaultSettings } from './utils/settings';

const app = express();
app.use(cors());
app.use(
	morgan('dev', {
		skip: (req: Request, res: Response) => {
			if (process.env.NODE_ENV == 'development') {
				return false;
			}
			if (req.originalUrl.includes('/images') || req.originalUrl.includes('/video') || req.originalUrl.includes('/status')) {
				return true;
			} else {
				return false;
			}
		},
	})
);
// app.use(helmet());
app.use(express.json());

const authHelper = new AuthenticationHelper<User>(app, '/auth', database, false, {
	settings: 'TEXT',
});
authHelper.options.register = false;
authHelper.options.allowMultipleSessions = true;
authHelper.options.authTokenStoreDatabase = true;
authHelper.install(
	async (token, userobj) => {
		const outSettings = compareSettings(userobj.settings as SettingsObject);
		await database.get('accounts').update({ UUID: userobj.UUID }, { settings: JSON.stringify(outSettings) });
	},
	async (userobj) => {
		//OnRegister
		await database.get('accounts').update(
			{
				UUID: userobj.UUID,
			},
			{
				settings: JSON.stringify(defaultSettings),
			}
		);
	}
);

setAuthHelper(authHelper);

let server: http.Server | https.Server;
if (process.env.https) {
	const sslProperties = {
		key: fs.readFileSync(process.env.KEY_FILE),
		cert: fs.readFileSync(process.env.CERT_FILE),
	};
	server = https.createServer(sslProperties, app);
} else {
	server = http.createServer(app);
}

setIO(
	new Server(server, {
		cors: {
			// origins: ['localhost:8080', '1b2.jodu555.de', 'cinema.jodu555.de'],
			methods: ['GET', 'POST'],
		},
	})
);

socket_initialize();

import { router as managment_router } from './routes/managment';
import { router as watch_router } from './routes/watch';
import { router as news_router } from './routes/news';
import { router as index_router } from './routes/index';
import video from './routes/video';
import todo from './routes/todo';

// Your Middleware handlers here
app.use('/images', authHelper.authentication(), express.static(path.join(process.env.PREVIEW_IMGS_PATH)));
app.get('/status', (req, res) => {
	res.status(200).json({});
}); // For some Uptime check

app.use('/managment', authHelper.authentication(), managment_router);
app.use('/watch', authHelper.authentication(), watch_router);
app.use('/news', authHelper.authentication(), news_router);
app.use('/index', authHelper.authentication(), index_router);

//Your direct routing stuff here
app.get('/video', authHelper.authentication(), video);
app.get('/todo', authHelper.authentication(), todo);

const errorHelper = new ErrorHelper();
app.use(errorHelper.install());

const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
	console.log(`Express & Socket App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
	console.log(getSeries().length);
});
