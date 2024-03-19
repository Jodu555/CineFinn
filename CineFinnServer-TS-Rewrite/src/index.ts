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
import IORedis from 'ioredis';
import { User, SettingsObject, Role, ActivityDetails } from './types/session';
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

import { getSeries, setIO, setAuthHelper, setIORedis } from './utils/utils';
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

const authHelper = new AuthenticationHelper<User>(
	app,
	'/auth',
	database,
	false,
	{
		settings: 'TEXT',
		role: 'INT',
		email: {
			type: 'varchar(64)',
			null: true,
		},
	},
	{
		token: {
			min: 10,
			max: 15,
		},
	}
);
authHelper.options.register = true;

type SchemaValidation = {
	success: boolean;
	errors: [string];
	object: any;
};

authHelper.options.restrictedRegister = (validation: SchemaValidation) => {
	if (validation.success) {
		// The not provided register token is longer than 15 chars to automatically make it impossible to register
		if (validation.object.token == process.env.REGISTRATION_TOKEN || 'asdfghjklöäasdfghjklsdfghjk') {
			delete validation.object.token;
			return true;
		}
	}
	return false;
};

authHelper.options.allowMultipleSessions = true;
authHelper.options.authTokenStoreDatabase = true;

authHelper.install(
	async (token, userobj) => {
		//OnLogin
		userobj = JSON.parse(JSON.stringify(userobj));
		if (typeof userobj.settings == 'string') {
			userobj.settings = JSON.parse(userobj.settings) as SettingsObject;
		}
		const outSettings = compareSettings(userobj.settings as SettingsObject);
		const details: ActivityDetails = {
			...(typeof userobj.activityDetails == 'string' ? (JSON.parse(userobj.activityDetails) as ActivityDetails) : userobj.activityDetails),
			lastLogin: new Date().toLocaleString('de'),
		};
		await database
			.get<Partial<User>>('accounts')
			.update({ UUID: userobj.UUID }, { settings: JSON.stringify(outSettings), activityDetails: JSON.stringify(details) });
	},
	async (userobj) => {
		//OnRegister
		await database.get<Partial<User>>('accounts').update(
			{
				UUID: userobj.UUID,
			},
			{
				settings: JSON.stringify(defaultSettings),
				email: userobj.username + '@nil.com',
				role: Role.User,
			}
		);
	},
	async (req, userobj) => {
		//onAuthenticated
		userobj = JSON.parse(JSON.stringify(userobj));
		if (typeof userobj.settings == 'string') {
			userobj.settings = JSON.parse(userobj.settings) as SettingsObject;
		}

		const outSettings = compareSettings(userobj.settings);
		const details: ActivityDetails = {
			lastIP: req.headers['x-forwarded-for'] as string,
			lastHandshake: new Date().toLocaleString('de'),
			lastLogin:
				typeof userobj.activityDetails == 'string'
					? (JSON.parse(userobj.activityDetails) as ActivityDetails)?.lastLogin
					: userobj.activityDetails?.lastLogin,
		};
		try {
			await database
				.get<Partial<User>>('accounts')
				.update({ UUID: userobj.UUID }, { settings: JSON.stringify(outSettings), activityDetails: JSON.stringify(details) });
		} catch (error) {
			console.error('This Could possibly fail if the db connection is still waking up but idk actually why this would happen IDK kill me plllzzz');
			console.error(error);
			console.error('This Could possibly fail if the db connection is still waking up but idk actually why this would happen IDK kill me plllzzz');
		}
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

if (process.env.USE_REDIS == 'true') {
	setIORedis(
		new IORedis({
			port: Number(process.env.REDIS_PORT) | 6379,
			host: process.env.REDIS_HOST,
			password: process.env.REDIS_PASSWORD,
			maxRetriesPerRequest: null,
		})
	);
} else {
	setIORedis(null);
}

socket_initialize();

import { router as managment_router } from './routes/managment';
import { router as watch_router } from './routes/watch';
import { router as news_router } from './routes/news';
import { router as index_router } from './routes/index';
import { router as recommendation_router } from './routes/recommmendation';
import { router as room_router } from './routes/room';
import { router as todo_router } from './routes/todo';
import video from './routes/video';
import { DatabaseSyncRoomItem } from './types/database';
import { roleAuthorization } from './utils/roleManager';

// Your Middleware handlers here
app.use('/images', authHelper.authentication(), express.static(path.join(process.env.PREVIEW_IMGS_PATH)));
app.get('/status', (req, res) => {
	res.status(200).json({});
}); // For some Uptime check

app.use('/managment', authHelper.authentication(), managment_router);
app.use('/watch', authHelper.authentication(), watch_router);
app.use('/news', authHelper.authentication(), news_router);
app.use('/index', authHelper.authentication(), index_router);
app.use('/recommendation', authHelper.authentication(), recommendation_router);
app.use('/room', authHelper.authentication(), room_router);
app.use('/todo', authHelper.authentication(), todo_router);

//Your direct routing stuff here
app.get('/video', authHelper.authentication(), video);

const errorHelper = new ErrorHelper();
app.use(errorHelper.install());

const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
	console.log(`Express & Socket App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
	console.log(getSeries().length);

	// database.get<DatabaseSyncRoomItem>('sync_rooms').create({
	// 	ID: '58932',
	// 	created_at: Date.now(),
	// 	seriesID: '8dc12299',
	// 	entityInfos: JSON.stringify({
	// 		season: 1,
	// 		episode: 1,
	// 		movie: 0,
	// 		lang: 'GerDub',
	// 	}),
	// 	members: JSON.stringify([
	// 		{ name: 'Jodu555', UUID: '', role: 1 },
	// 		{ name: 'TRyFlow', UUID: '', role: 1 },
	// 	]),
	// });
});

process.on('unhandledRejection', (reason: string, p: Promise<any>) => {
	console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
	console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});
