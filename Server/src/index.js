const path = require('path');
const fs = require('fs');

require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
database.connect();

const { CommandManager } = require('@jodu555/commandmanager');
CommandManager.createCommandManager(process.stdin, process.stdout);
const { registerCommands } = require('./utils/commands');
registerCommands();

const { ErrorHelper, AuthenticationHelper } = require('@jodu555/express-helpers');
require('./utils/database')();

const { initialize: socket_initialize } = require('./sockets');

const { getSeries, setIO, setAuthHelper } = require('./utils/utils.js');
const { defaultSettings, compareSettings } = require('./utils/settings.js');

const app = express();
app.use(cors());
app.use(
	morgan('dev', {
		skip: (req, res) => {
			//TODO: Add the images back in
			if (req.originalUrl.includes('/TODO:') || req.originalUrl.includes('/video')) {
				return true;
			} else {
				return false;
			}
		},
	})
);
// app.use(helmet());
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database, false, {
	settings: 'TEXT',
});
authHelper.options.register = false;
authHelper.options.allowMultipleSessions = true;
authHelper.options.authTokenStoreDatabase = true;
authHelper.install(
	async (token, userobj) => {
		const outSettings = compareSettings(userobj.settings);
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

let server;
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
			origins: ['localhost:8080', '1b2.jodu555.de', 'cinema.jodu555.de'],
			methods: ['GET', 'POST'],
		},
	})
);

socket_initialize();

const { router: managment_router } = require('./routes/managment.js');
const { router: watch_router } = require('./routes/watch');
const { router: news_router } = require('./routes/news');
const { router: index_router } = require('./routes/index');
const video = require('./routes/video.js');
const { generateImages } = require('./utils/images');

// Your Middleware handlers here
app.use('/images', authHelper.authentication(), express.static(path.join(process.env.PREVIEW_IMGS_PATH)));

app.use('/managment', authHelper.authentication(), managment_router);
app.use('/watch', authHelper.authentication(), watch_router);
app.use('/news', authHelper.authentication(), news_router);
app.use('/index', authHelper.authentication(), index_router);

//Your direct routing stuff here
app.get('/video', authHelper.authentication(), video);

const errorHelper = new ErrorHelper();
app.use(errorHelper.install());

const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
	console.log(`Express & Socket App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
	console.log(getSeries().length);

	// console.log(getSeries().map(x => [...x.seasons, ...x.movies]).flat(5).length);

	// console.log();

	// generateImages([getSeries()[13]]);
	// const merge = mergeSeriesArrays(crawlAndIndex(), crawlAndIndex())
	// console.log(merge);
	// generateImages([getSeries()[0]])
});
