import { createHash } from 'node:crypto';
import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { generateOverview, generateAccounts, generateSubSystems, sendSocketAdminUpdate } from '../utils/admin';
import { AuthenticatedRequest } from '../types/session';
import { getSeries, getVideoFilePath } from '../utils/utils';
import { additionalMovingItems, getSubSocketByID } from '../sockets/sub.socket';
const database = Database.getDatabase();

const router = express.Router();

router.get(
    '/accounts',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        res.json(await generateAccounts());
    }
);

router.get(
    '/subsystems',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        res.json(await generateSubSystems());
    }
);

router.delete('/subsystems/movingItem', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    while (additionalMovingItems.length > 0) {
        additionalMovingItems.pop();
    }
    sendSocketAdminUpdate();
    res.status(200).send();
});

router.post('/subsystems/movingItem', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

    const toSubSystemID = req.body.to;

    const socket = getSubSocketByID(toSubSystemID);

    if (toSubSystemID !== 'main' && socket == undefined) {
        res.status(400).send('No SubSystem found!');
        return;
    }

    if (req.body.series != undefined && Array.isArray(req.body.series)) {
        const series = req.body.series as string[];
        const serieses = (await getSeries()).filter(
            x => series.some(y => y == x.ID)
        );

        if (serieses.length == 0) {
            res.status(400).send('No Series found!');
            return;
        }

        for (const series of serieses) {
            for (const episode of series.seasons.flat()) {
                if (episode.subID == toSubSystemID) continue;
                for (const lang of episode.langs) {
                    const filePath = getVideoFilePath(episode, lang);
                    additionalMovingItems.push({
                        ID: createHash('md5').update(`${series.ID}${episode.subID}${toSubSystemID}${filePath}`).digest('base64'),
                        seriesID: series.ID,
                        fromSubID: episode.subID,
                        toSubID: toSubSystemID,
                        filePath: filePath,
                        entity: episode,
                    });
                }
            }
        }
        sendSocketAdminUpdate();
    }


    res.status(200).send();
});

router.get(
    '/overview',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        res.json(await generateOverview());
    }
);

export { router };