import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { AuthenticatedRequest } from '../types/session';
import fileUpload from "express-fileupload";
const database = Database.getDatabase();

const router = express.Router();

interface metaEpisode {
    type: 'episode';
    seriesID: string;
    sesasonIdx: number;
    episodeIdx: number;
    language: string;
    key: string;
}

interface metaMovie {
    type: 'movie';
    seriesID: string;
    primaryName: string;
    language: string;
    key: string;
}

type meta = metaEpisode | metaMovie;

const keys = new Map<string, meta>();

router.post('/createPresignedURL', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {


    if (req.body.type === 'episode') {
        const key = crypto.randomBytes(16).toString('hex');
        const { seriesID, sesasonIdx, episodeIdx, language } = req.body;

        keys.set(key, { type: 'episode', seriesID, sesasonIdx, episodeIdx, language, key });

        res.json({
            key,
        });
        return;
    }

    if (req.body.type === 'movie') {
        const key = crypto.randomBytes(16).toString('hex');
        const { seriesID, primaryName, language } = req.body;

        keys.set(key, { type: 'movie', seriesID, primaryName, language, key });

        res.json({
            key,
        });
        return;
    }

});

router.post('/deletePresignedURL', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { key } = req.body;

    if (!key) {
        res.status(400).send('Missing Parameters');
        return;
    }

    const meta = keys.get(key);

    if (!meta) {
        res.status(400).send('Invalid Key');
        return;
    }

    keys.delete(key);

    res.json(
        meta
    );
});

router.post("/upload", fileUpload(), async (req, res) => {

    const key = req.query.key;

    if (!key || typeof key !== 'string') {
        res.status(400).send('Missing Key');
        return;
    }

    const uploadMeta = keys.get(key);

    if (!uploadMeta) {
        res.status(400).send('Invalid Key');
        return;
    }

    console.time('uploading');
    if (!req.files?.file) {
        return res.status(400).send("No file uploaded");
    }
    const files: fileUpload.UploadedFile[] = [];
    if (!Array.isArray(req.files.file)) {
        files.push(req.files.file);
    } else {
        files.push(...req.files.file);
    }

    let uploadLocation = path.join(process.env.PREVIEW_IMGS_PATH, uploadMeta.seriesID, 'previewImages');

    if (uploadMeta.type === 'episode') {
        uploadLocation = path.join(uploadLocation, `${uploadMeta.sesasonIdx}-${uploadMeta.episodeIdx}`, uploadMeta.language);
    } else if (uploadMeta.type === 'movie') {
        uploadLocation = path.join(uploadLocation, 'Movies', uploadMeta.primaryName, uploadMeta.language);
    }

    for (const file of files) {
        if (!fs.existsSync(uploadLocation)) {
            fs.mkdirSync(uploadLocation, { recursive: true });
        }
        await file.mv(path.join(uploadLocation, file.name));
    }
    res.json({ dir: uploadLocation, uploadMeta });
    console.timeEnd('uploading');
});

export { router, keys };