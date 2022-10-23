const fs = require('fs');
const { default: getVideoDurationInSeconds } = require('get-video-duration');
const path = require('path');
require('dotenv').config();
const { getVideoEntity } = require('./classes/series');
const { generateImages } = require('./utils/images');
const { promiseAllLimit } = require('./utils/utils');

// const { Database } = require('@jodu555/mysqlapi');
// const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
// database.connect();

// require('./utils/database')();

const { parse, new_parse, Segment } = require('./utils/watchString');

const watchStr = '49381178:1-1.1356;49381178:1-2.0;49381178:1-4.0;undefined:1-2.0;undefined:1-1.0;9123caba:1-1.2704;9123caba:1-11.1414;9123caba:1-12.1417;9123caba:1-13.1419;9123caba:1-14.1403;9123caba:1-15.1415;9123caba:1-16.1416;9123caba:1-17.1421;9123caba:1-18.1418;9123caba:1-19.1410;9123caba:1-20.1410;9d0bb206:1-20.0;9d0bb206:1-1.714;9d0bb206:1-10.2;9d0bb206:1-8.538;8b76d630:1-8.1422;8b76d630:1-1.1344;8b76d630:1-9.1430;8b76d630:1-7.1431;8b76d630:1-6.1351;8b76d630:1-4.1384;8b76d630:1-5.1343;8b76d630:1-10.1394;814f331c:1-10.1346;814f331c:1.698;9d0bb206:2.0;9d0bb206:1-6.1017;48ccd6f0:1-6.0;9123caba:1-21.1419;9123caba:1-22.1418;9123caba:1-23.1406;9123caba:1-24.1363;00ba2a50:1-1.1411;00ba2a50:1-2.1380;00ba2a50:1-3.1381;00ba2a50:1-4.1342;00ba2a50:1-5.1335;00ba2a50:1-6.1283;dd921d8f:1-7.313;dd921d8f:1-1.1414;dd921d8f:1-2.1369;dd921d8f:1-3.64;814f331c:1-3.1348;48ccd6f0:1.0;79079ccb:1.0;8e2426ae:1-1.1422;814f331c:1-1.1398;814f331c:2.0;8e2426ae:2.0;8e2426ae:1-2.1400;8e2426ae:1-3.1422;8e2426ae:1-4.1417;8e2426ae:1-5.1419;8e2426ae:1-6.1403;8e2426ae:1-7.1417;8e2426ae:1-8.1380;8e2426ae:1-9.1419;8e2426ae:1-10.1413;8e2426ae:1-11.1415;814f331c:1-12.1513;814f331c:1-18.1423;814f331c:1-15.1348;814f331c:2-1.1;814f331c:2-11.1372;814f331c:2-12.4;9123caba:2-12.0;9123caba:1-25.1421;9123caba:2-1.0;48ccd6f0:1-25.0;48ccd6f0:2.0;14580e05:1-1.1430;14580e05:1-20.1384;00ba2a50:1-7.1410;00ba2a50:1-8.1357;00ba2a50:1-9.1343;00ba2a50:1-10.1352;00ba2a50:1-11.1349;79079ccb:1-12.0;79079ccb:1-1.1454;79079ccb:1-2.1453;79079ccb:1-3.1341;79079ccb:1-4.1432;79079ccb:1-5.1348;82b956d3:1-1.1354;82b956d3:1-17.1473;82b956d3:1-13.1317;82b956d3:1-14.1377;82b956d3:2-1.1392;1b0aa50a:1-1.0;1b0aa50a:2-1.0;14580e05:1-15.1394;14580e05:1-19.1334;79079ccb:1-19.0;bd8b45d0:1-1.0;bd8b45d0:1-11.1356;bd8b45d0:1-8.1283;bd8b45d0:1-9.1388;bd8b45d0:1-10.1363;bd8b45d0:1-12.1356;bd8b45d0:1-13.1357;bd8b45d0:1-14.1346;bd8b45d0:1-15.1337;bd8b45d0:1-16.1195;bd8b45d0:2-1.1348;bd8b45d0:2-17.1338;bd8b45d0:2-13.1378;bd8b45d0:2-14.1331;bd8b45d0:2-11.1419;bd8b45d0:2-10.1425;bd8b45d0:2-8.1348;bd8b45d0:2-7.1402;bd8b45d0:2-6.983;bd8b45d0:2-9.1347;bd8b45d0:2-12.1352;95683437:2-14.1171;95683437:4-1.0;bd8b45d0:4-1.0;bd8b45d0:2-15.1350;bd8b45d0:2-16.1344;bd8b45d0:2-18.1318;bd8b45d0:2-20.1337;bd8b45d0:2-21.1423;bd8b45d0:2-22.1337;bd8b45d0:2-23.1419;bd8b45d0:2-24.1418;8b76d630:2-24.1418;8b76d630:1-11.1419;8b76d630:1-3.1376;8b76d630:1-12.1423;8b76d630:1-2.1381;f2d4d89e:1-3.1405;f2d4d89e:1-1.1298;f2d4d89e:1-2.1354;f2d4d89e:1-4.1305;f2d4d89e:1-5.1385;f2d4d89e:1-6.1418;f2d4d89e:1-7.1305;f2d4d89e:1-8.1335;f2d4d89e:1-9.1264;f2d4d89e:1-10.1353;f2d4d89e:1-11.1302;f2d4d89e:1-12.1345;f2d4d89e:1-13.1335;f2d4d89e:2-1.1368;f2d4d89e:2-2.1357;f2d4d89e:2-3.1356;f2d4d89e:2-4.1347;f2d4d89e:2-5.1335;f2d4d89e:2-6.1335;f2d4d89e:2-7.1339;f2d4d89e:2-8.1343;f2d4d89e:2-9.1363;f2d4d89e:2-10.1355;f2d4d89e:2-11.1378;f2d4d89e:2-12.1415;f2d4d89e:3-1.65;64cd2545:1-1.0;64cd2545:1-15.1329;64cd2545:1-16.1419;64cd2545:1-17.1318;64cd2545:1-18.1321;64cd2545:1-19.1329;64cd2545:1-20.1317;64cd2545:1-21.1340;64cd2545:1-22.1329;64cd2545:1-23.1317;64cd2545:1-24.1388;64cd2545:1-25.1431;dda00ebc:3-1.0;dda00ebc:1-1.1337;dda00ebc:1-2.1356;dda00ebc:1-3.1379;dda00ebc:1-4.1350;dda00ebc:1-5.1353;dda00ebc:1-6.1414;dda00ebc:1-7.1344;dda00ebc:1-8.1420;dda00ebc:1-9.1379;dda00ebc:1-10.1363;dda00ebc:1-11.1361;dda00ebc:1-12.1378;dda00ebc:1-13.1382;dda00ebc:1-14.1380;dda00ebc:1-15.1347;dda00ebc:1-16.1332;dda00ebc:1-17.1425;dda00ebc:1-18.1337;dda00ebc:1-19.1348;dda00ebc:1-20.1343;dda00ebc:1-21.1343;dda00ebc:1-22.1154;79079ccb:1-22.1154;b7a1a027:1-2.1339;b7a1a027:1-1.1276;b7a1a027:1-3.1381;b7a1a027:1-4.1418;b7a1a027:1-5.1338;b7a1a027:1-6.1335;b7a1a027:1-7.1347;b7a1a027:1-8.1423;b7a1a027:1-9.1346;b7a1a027:1-10.1348;b7a1a027:1-11.1337;b7a1a027:1-12.1418;14580e05:1-8.1343;b7a1a027:1-13.1423;e17eb9ea:1-1.1377;e17eb9ea:1-2.1401;e17eb9ea:1-3.1371;e17eb9ea:1-4.1423;e17eb9ea:1-5.808;undefined:1.0;ef3d54f3:1.0;ef3d54f3:1-1.0;ef3d54f3:2-1.0;ee28ef23:1-1.1334;ee28ef23:1-2.1331;ee28ef23:1-3.520;ee28ef23:1-4.1335;66a3a052:1-1.1;66a3a052:1-3.1321;66a3a052:1-4.1336;66a3a052:1-5.1340;66a3a052:1-6.1340;66a3a052:1-7.1359;66a3a052:1-8.1340;66a3a052:1-9.1381;66a3a052:1-10.1344;66a3a052:1-11.1352;66a3a052:1-12.1413;314966cb:1-1.1374;314966cb:1-2.1393;314966cb:1-3.1377;314966cb:1-4.1363;314966cb:1-5.1387;314966cb:1-6.1384;314966cb:1-7.1511;314966cb:1-8.1373;314966cb:1-9.1453;1033107b:2-1.0;0cb584e2:3-1.0;0cb584e2:2-1.0;0cb584e2:1-1.0;1033107b:1-1.1431;ee28ef23:1-7.1412;ee28ef23:1-5.1324;ee28ef23:1-6.1333;cd959fda:1-8.0;2f128528:1-1.1349;2f128528:1-3.1336;2f128528:1-4.1351;cd959fda:1-1.0;0f0b7a08:1-1.0;0f0b7a08:2-1.0;0f0b7a08:1-7.650;0f0b7a08:1-6.670;0f0b7a08:2-8.647;0f0b7a08:2-7.786;49ea28fe:1-1.1340;49ea28fe:1-2.1337;1033107b:1-2.1387;1033107b:1-3.1330;1033107b:1-4.1336;1033107b:1-5.1358;1033107b:1-6.1341;1033107b:1-7.1323;1033107b:1-8.1311;1033107b:1-9.1373;1033107b:1-10.1368;1033107b:1-11.1382;1033107b:1-12.1450;cafff220:2-1.0;cafff220:1-1.1;41a5d679:1-1.0;41a5d679:7.0;41a5d679:8.0;41a5d679:4.0;41a5d679:2-1.0;41a5d679:1.0;a570c73c:1-1.0;a570c73c:1-11.1369;a570c73c:1-5.481;a570c73c:1-6.1309;a2c45f3d:1-6.0;a2c45f3d:1-1.0;a2c45f3d:2-1.0;a2c45f3d:3-1.0;a2c45f3d:4-1.0;a2c45f3d:4-7.548;a2c45f3d:4-5.593;a2c45f3d:6.0;baeaf204:1-1.1393;0cb584e2:1-7.0;95683437:1-1.1399;95683437:1-2.1353;95683437:1-7.1317;0f0b7a08:2-13.3;46eda97a:2-13.0;ba1a71d7:1-1.0;ba6983d0:1-1.1351;ba6983d0:1-2.1421;ba6983d0:1-3.1381;ba6983d0:1-4.1346;ba6983d0:1-5.1415;ba6983d0:1-6.1349;ba6983d0:1-7.1345;ba6983d0:1-8.1363;ba6983d0:1-9.1339;ba6983d0:1-10.1342;ba6983d0:1-11.1334;ba6983d0:1-12.1421;8e2426ae:1-12.1421;42d01d09:1-15.2;42d01d09:1-1.1237;42d01d09:2-1.0;42d01d09:1-2.1421;42d01d09:1-3.1421;42d01d09:1-4.1340;42d01d09:1-5.1338;42d01d09:1-6.1343;42d01d09:1-7.1339;42d01d09:1-8.1339;42d01d09:1-9.1332;42d01d09:1-10.1307;42d01d09:1-11.1172;bc3ed45e:1-1.1219;bc3ed45e:1-12.1421;bc3ed45e:1-11.1338;95683437:1-3.1393;95683437:1-4.1357;95683437:1-5.1390;95683437:1-6.1415;95683437:1-8.1342;95683437:1-9.1322;95683437:1-10.1421;95683437:1-11.366;b1a80621:1-11.0;b1a80621:1-1.1352;b1a80621:1-2.1356;b1a80621:1-3.1408;b1a80621:1-4.1352;1c1404f8:1-5.1388;1c1404f8:1-1.1589;1c1404f8:1-2.1404;ed211184:1-1.320;bd8b45d0:1-17.1366;bd8b45d0:1-18.1354;bd8b45d0:1-19.1336;bd8b45d0:1-20.1358;bd8b45d0:1-21.1346;bd8b45d0:1-22.1398;bd8b45d0:1-23.1362;bd8b45d0:1-24.1377;bd8b45d0:2-2.1330;bd8b45d0:2-3.1350;bd8b45d0:2-4.1142;bd8b45d0:2-5.1273;bd8b45d0:2-19.1337;1c1404f8:1-3.1436;1c1404f8:1-4.811;9123caba:1-2.1299;9123caba:1-3.1337;9123caba:1-4.1401;9123caba:1-5.1330;9123caba:1-6.1413;9123caba:1-7.1411;9123caba:1-8.1337;9123caba:1-9.1351;9123caba:1-10.1375;1c1404f8:1-6.1362;1c1404f8:1-7.1344;1c1404f8:1-8.1086;14580e05:1-25.1421;14580e05:1-2.1364;14580e05:1-3.1331;14580e05:1-4.1342;14580e05:1-5.1354;14580e05:1-6.1349;14580e05:1-7.1419;14580e05:1-9.1345;14580e05:1-10.1340;14580e05:1-11.1375;14580e05:1-12.1355;14580e05:1-13.1345;14580e05:1-14.1358;14580e05:1-16.1351;14580e05:1-17.1324;14580e05:1-18.1416;14580e05:1-21.1422;14580e05:1-22.1385;14580e05:1-23.4;42d01d09:1-12.0;cafff220:1-12.0;5c836256:1-1.1393;6a8720f5:1-1.1335;6a8720f5:1-2.1338;6a8720f5:1-3.1337;6a8720f5:1-4.1333;6a8720f5:1-5.1331;6a8720f5:1-6.1320;2f128528:1-2.1421;6a8720f5:1-7.1330;6a8720f5:1-8.1333;6a8720f5:1-9.190;dbc0aa61:1-1.1394;dbc0aa61:1-2.1382;dbc0aa61:1-3.1364;dbc0aa61:1-4.1349;dbc0aa61:1-5.1351;dbc0aa61:1-6.1304;dbc0aa61:1-7.1449;dbc0aa61:1-8.1363;dbc0aa61:1-9.1423;dbc0aa61:1-10.0;125e06d6:1-1.300;125e06d6:1-9.1276;125e06d6:1-10.1421;314966cb:1-10.1368;314966cb:1-11.1355;314966cb:1-12.1366;5c836256:1-2.1364;5c836256:1-3.628;b58d01b1:1-3.1406;b58d01b1:1-1.1230;b58d01b1:1-2.1216;125e06d6:1-11.1359;e2708912:1-10.1319;e2708912:1-1.1367;e2708912:1-2.1347;e2708912:1-3.1338;e2708912:1-4.1344;e2708912:1-5.1338;e2708912:1-6.1321;e2708912:1-7.1345;e2708912:1-8.1296;e2708912:1-9.1347;e2708912:1-11.1326;e2708912:1-12.1336;bc3ed45e:1-3.1330;bc3ed45e:1-2.1421;bc3ed45e:1-4.1421;bc3ed45e:1-5.1357;bc3ed45e:1-6.1406;bc3ed45e:1-7.1340;bc3ed45e:1-8.1337;bc3ed45e:1-9.1322;bc3ed45e:1-10.1315;ed211184:1-4.0;ed211184:1-5.0;ed211184:1-2.0;f59fd31f:1-1.0;e028ed05:1.0;e028ed05:1-1.0;e028ed05:1-6.450;e028ed05:1-8.1421;e028ed05:1-9.1329;e028ed05:1-10.1255;125e06d6:1-12.1421;79079ccb:1-6.1351;baeaf204:1-6.0;baeaf204:1-2.1334;baeaf204:1-3.1313;baeaf204:1-4.1092;814f331c:1-4.1511;814f331c:1-2.1415;814f331c:1-5.1348;348092b1:1-1.0;82b956d3:5-1.3;82b956d3:5-7.1;82b956d3:5-8.1;82b956d3:5-9.2;82b956d3:5-10.1;82b956d3:5-2.2;82b956d3:4-1.2;82b956d3:5-3.0;82b956d3:5-4.0;82b956d3:5-5.1;82b956d3:5-6.1;82b956d3:5-11.1;82b956d3:5-12.1;82b956d3:5-13.2;82b956d3:1-12.1454;82b956d3:2-7.1107;82b956d3:2-6.1348;82b956d3:2-11.1402;82b956d3:2-12.1390;82b956d3:1-15.1491;82b956d3:1-16.1484;82b956d3:1-18.1477;814f331c:1-6.1334;814f331c:1-7.1249;814f331c:1-8.1357;814f331c:1-9.1340;814f331c:1-11.1399;814f331c:1-13.1415;814f331c:1-14.1345;814f331c:1-16.1364;814f331c:1-17.1345;814f331c:1-19.1345;814f331c:1-20.1342;814f331c:1-21.1371;814f331c:1-22.1359;814f331c:1-23.1345;814f331c:1-24.1342;814f331c:1-25.1351;814f331c:1-26.1423;f68607c2:1-1.0;f68607c2:1-3.0;8922a4f0:1-1.1385;c4a1b9fc:1-1.120;8922a4f0:1-2.1386;8922a4f0:1-3.1327;8922a4f0:1-4.1191;314966cb:2-1.0;47f780cd:1-1.0;0f0b7a08:1-9.0;0f0b7a08:1-8.0;0f0b7a08:1-11.0;0f0b7a08:2-10.0;0f0b7a08:2-12.0;';



const filenameParser = (filepath, filename) => {
    // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

    const parsers = [
        {
            //v1 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+).mp4/ig,
            parse: (match) => {
                console.log('456');
                const [
                    original,
                    title,
                    season,
                    episode,
                ] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
            }
        },
        {
            //v2 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+)_(GerSub|GerDub).mp4/ig,
            parse: (match) => {
                const [
                    original,
                    title,
                    season,
                    episode,
                    language,
                ] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language };
            }
        },
        {
            //v2 Movie Parser
            re: /^(.*)_(GerSub|GerDub)\.mp4/ig,
            parse: (match) => {
                console.log(`match`, match);
                const [
                    original,
                    movieTitle,
                    language,
                ] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle, language };
            }
        },
        {
            //v1 Movie Parser
            re: /^(.*)\.mp4/ig,
            parse: (match) => {
                const [
                    original,
                    movieTitle,
                ] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle };
            }
        },
    ]

    let found = false;
    let output = {};
    for (const parser of parsers) {
        const match = parser.re.exec(filename);
        // console.log(parser.re, match);
        if (match != null) {
            found = true;
            output = parser.parse(match);
            break;
        }
    }

    if (!found) {
        console.log('No Parser found for', found, filename);
    }
    return output;

}


// // console.log(new_parse(watchStr));


// console.log(JSON.stringify(parse(watchStr)) == JSON.stringify(new_parse(watchStr)));


const series = JSON.parse(fs.readFileSync(process.env.LOCAL_DB_FILE, 'utf8'));

const wait = ms => new Promise((rs, _) => setTimeout(_ => { console.log('Run'); rs(); }, ms));


(async () => {

    // const limit = await promiseAllLimit(5);

    // // const limit = pLimit(10);
    // const arr = Array.from({
    //     length: 100
    // }, () => {
    //     return limit(() => wait(5000));
    // });

    // await Promise.all(arr);

    // console.log(`arr`, arr);
    return;
    const serie = series.find(s => s.title == 'The Irregular at Magic High School');

    console.log(serie);

    generateImages([serie]);

    return;
    const newSeries = await Promise.all(series.map(serie => {
        return new Promise(async (resolve, _) => {
            const newSeasons = await Promise.all(serie.seasons.map(async season => {
                return await Promise.all(season.map(e => {
                    return new Promise(async (resolve, _) => {
                        const duration = await getVideoDurationInSeconds(e.filePath);
                        console.log('got', e.primaryName, duration);
                        resolve({ ...e, duration })
                    })
                }));
            }));
            resolve({ ...serie, seasons: newSeasons });
        })
    }));
    fs.writeFileSync('new-time.json', JSON.stringify(newSeries, null, 3))

    // console.log(JSON.stringify(newSeries, null, 3));

})();


// getVideoEntity(seriesID, 2, 5);


