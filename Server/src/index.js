const path = require('path');
const fs = require('fs');

require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require("socket.io");
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');
const { ErrorHelper, AuthenticationHelper } = require('@jodu555/express-helpers');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('rooti.jodu555.de', 'cinema', process.env.DB_PASSWORD, 'cinema');
database.connect();

const { getSeries, setIO, getIO } = require('./utils/utils.js');

const app = express();
app.use(cors());
app.use(morgan('dev'));
// app.use(helmet());
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database);
authHelper.options.register = false;
authHelper.install();

app.use((req, res, next) => {
    if (req.path.includes('/assets/previewImgs')) {
        res.set('Cache-control', `public, max-age=${60 * 5}`)
    }
    next();
})

let server;
if (process.env.https) {
    const sslProperties = {
        key: fs.readFileSync(process.env.KEY_FILE),
        cert: fs.readFileSync(process.env.CERT_FILE),
    };
    server = https.createServer(sslProperties, app)
} else {
    server = http.createServer(app);
}

setIO(
    new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    })
)

const io = getIO();

io.on('connection', (socket) => {
    console.log('Socket Connection:', socket.id);

});


// Your Middleware handlers here
app.use(express.static(path.join('dist'))); // The Vue build files
app.use('/previewImages', authHelper.authentication(), express.static(path.join(process.env.PREVIEW_IMGS_PATH)));

app.get("/video", authHelper.authentication(), require('./routes/video.js'));

app.use('/managment', authHelper.authentication(), require('./routes/managment.js').router)

app.get('/index', authHelper.authentication(), (req, res, next) => {
    res.json(getSeries());
});

const errorHelper = new ErrorHelper()
app.use(errorHelper.install());


const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
    console.log(`Express & Socket App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
    console.log(getSeries().length);
    console.log(getSeries().map(x => [...x.seasons, ...x.movies]).flat(5).length);
    // await checkImages(getSeries());
});
