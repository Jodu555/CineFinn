import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { generateOverview, generateAccounts, generateSubSystems } from '../utils/admin';
import { AuthenticatedRequest } from '../types/session';
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

router.post('/subsystems/movingItem', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

    console.log(req.body);


    res.status(200).send();
});

router.get(
    '/overview',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        res.json(await generateOverview());
    }
);

export { router };