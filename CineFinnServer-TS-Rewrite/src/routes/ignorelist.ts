import fs from 'fs';
import path from 'path';
import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { generateOverview, generateAccounts, generateSubSystems } from '../utils/admin';
import { AuthenticatedRequest } from '../types/session';
const database = Database.getDatabase();

const router = express.Router();

const filePath = "Z:/home/Work/Notes/NO Update Animes List Local.md";

router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.json(load());
});

router.put('/item', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('Adding Ignorance Item', req.body);
    // fs.appendFileSync(filePath, `\r\n${req.body.ID} ${req.body.title}`);
    const data = load();
    data.push(req.body);
    fs.writeFileSync(filePath, data.map(item => `${item.ID} ${item.title}`).join('\r\n'));
    res.status(200);
});

router.delete('/item/:ID', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ID = req.params.ID;
    console.log('Removing Ignorance Item', ID);

    const data = load();
    const result = data.filter(item => item.ID !== ID);
    fs.writeFileSync(filePath, result.map(item => `${item.ID} ${item.title}`).join('\r\n'));

    res.status(200);

});

function load(): { ID: string, title: string; }[] {

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
    }

    const data = fs.readFileSync(filePath, 'utf8');

    const lines = data.split('\r\n').filter(line => line.trim().length > 0 && !line.startsWith('#'));
    const output: { ID: string, title: string; }[] = [];
    for (const line of lines) {
        const [ID, ...rest] = line.split(' ');
        const title = rest.join(' ');
        output.push({ ID, title });
    }
    return output;
}

export { router };