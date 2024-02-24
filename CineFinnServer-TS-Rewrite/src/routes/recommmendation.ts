import { Database } from '@jodu555/mysqlapi';
import axios from 'axios';
import express from 'express';
import { Series } from '../classes/series';
import { load, parse } from '../utils/watchString';
const database = Database.getDatabase();

const router = express.Router();

let cached: Series[] = [];

router.get('/', async (req, res) => {
    console.time('complete')
    const forYouItems = 20;
    const newestItems = 15;
    const watchAgainItems = 18;
    const continueWatchingItems = 18;

    console.time('mockRequest')
    if (cached.length == 0) {
        const response = await axios.get<Series[]>(`http://cinema-api.jodu555.de/index/all?auth-token=${process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API}`);
        cached = response.data;
    }

    const remoteSeries = cached;
    console.timeEnd('mockRequest')


    console.time('LoadParse')
    const list = parse(await load('c2f5c833-c3e4-45a6-87b5-05103ff274ff'));
    // const list = parse(await load('ad733837-b2cf-47a2-b968-abaa70edbffe'));
    console.timeEnd('LoadParse')


    console.time('map')
    const group: { [key: string]: number } = {};
    list.map(x => x?.ID).forEach(n => {
        group[n] = !group[n] ? 1 : group[n] + 1
    })
    console.timeEnd('map')



    function groupit(group: { [key: string]: number }): { ID: string, name: string, watched: number, total: number, percent: number }[] {
        const out = new Array(Object.keys(group).length);

        Object.keys(group).forEach(x => {
            const remoteSerie = remoteSeries.find(s => s.ID == x);
            if (!remoteSerie)
                return;

            const totalEntitys = remoteSerie.seasons.flat().length + remoteSerie.movies.length;

            let percent = parseFloat(String(group[x] / totalEntitys * 100))
            if (percent > 100)
                percent = 100;
            out.push({
                ID: x,
                name: remoteSerie.title,
                watched: group[x],
                total: totalEntitys,
                percent: parseFloat(percent.toFixed(2)),
            });
        });
        return out;
    }

    console.time('groupit')
    const out = groupit(group);
    console.timeEnd('groupit')


    let foryou = [];
    let newest = [];
    let watchagain = [];
    let continueWatching = [];

    console.time('prepareSeries')
    const series = remoteSeries
        .filter((x) => x.categorie == 'Aniworld' && !x.title.includes('Redo of Healer'))
        .map((x) => ({
            ID: x.ID,
            url: `http://cinema-api.jodu555.de/images/${x.ID}/cover.jpg?auth-token=${process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API}`,
            title: x.title,
            infos: x.infos,
        }));
    console.timeEnd('prepareSeries')

    console.time('foryou')
    foryou = series
        .slice()
        .sort((a, b) => 0.5 - Math.random())
        .slice(0, forYouItems);
    console.timeEnd('foryou')

    console.time('newest')
    newest = series.reverse().slice(0, newestItems);
    console.timeEnd('newest')


    console.time('watchagain')
    watchagain = out.slice()
        // .sort((a, b) => b.percent - a.percent)
        .filter(a => a.percent > 99)
        .map(x => {
            const serie = series.find(n => n.ID == x.ID);
            return serie ? serie : null;
        }).filter(x => x != null).slice(0, watchAgainItems * 3)
        .sort((a, b) => 0.5 - Math.random()).slice(0, watchAgainItems);
    console.timeEnd('watchagain')

    const continueBound = [30, 80];

    console.time('continueWatching')
    continueWatching = out.slice()
        .filter((a) => a.percent < continueBound[1] && a.percent > continueBound[0])
        .map(x => {
            const serie = series.find(n => n.ID == x.ID);
            return serie ? serie : null;
        }).filter(x => x != null).slice(0, continueWatchingItems * 3)
        .sort((a, b) => 0.5 - Math.random()).slice(0, continueWatchingItems);
    console.timeEnd('continueWatching')

    console.timeEnd('complete')
    res.json({
        // foryou: { title: 'For You', data: foryou },
        newest: { title: 'Newest', data: newest.map(x => x.ID) },
        watchagain: { title: 'Watch Again', data: watchagain.map(x => x.ID) },
        continueWatching: { title: 'Continue Watching', data: continueWatching.map(x => x.ID) },
    });
});

export { router };
