import { Hono } from "hono";
import { authFullMiddleware } from "../middleware/auth.js";
import { Role } from "@cinefinn/types/database";
import z from "zod";
import { getConfig } from "../config.js";
import path from "path";
import fs from "fs";
import { tryCatch } from "@cinefinn/utilities/tryCatch";
import { HTTPException } from "hono/http-exception";

const presignMeta = z.object({
    type: z.enum(['movie', 'episode']),
    seriesUUID: z.string(),
    watchabelUUID: z.string(),
    watchableEntityUUID: z.string(),
});

const presignedRequests = new Map<string, z.infer<typeof presignMeta>>();

const router = new Hono()
    .post('/createPresignedURL', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const jsonBody = await c.req.json();
        const presignMetaData = presignMeta.parse(jsonBody);

        const key = crypto.randomUUID();
        presignedRequests.set(key, presignMetaData);

        return c.json({
            key
        });
    })
    .post('/upload', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const key = c.req.query('key');
        if (key == undefined) {
            throw new HTTPException(400, { message: 'No key provided' });
        }

        if (presignedRequests.has(key) === false) {
            throw new HTTPException(400, { message: 'No such key' });
        }

        const presignMetaData = presignedRequests.get(key)!;

        const formData = await c.req.parseBody({ all: true });

        const rawFiles = formData['file'];
        const fileEntries: File[] = rawFiles
            ? Array.isArray(rawFiles)
                ? (rawFiles.filter((f) => f instanceof File) as File[])
                : rawFiles instanceof File
                    ? [rawFiles]
                    : []
            : [];

        if (fileEntries.length === 0) {
            throw new HTTPException(400, { message: 'No files received' });
        }

        const destDir = path.join(getConfig().imagePath, presignMetaData.seriesUUID, 'previewImages', presignMetaData.watchabelUUID, presignMetaData.watchableEntityUUID);
        await fs.promises.mkdir(destDir, { recursive: true });

        const saved: string[] = [];

        await Promise.all(
            fileEntries.map(async (file) => {
                const dest = path.join(destDir, file.name);
                const buffer = Buffer.from(await file.arrayBuffer());
                await fs.promises.writeFile(dest, buffer);
                saved.push(file.name);
            }),
        );

        return c.json({ ok: true, saved });
    })
    .post('/deletePresignedURL', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const key = c.req.query('key') as string;
        if (key == undefined) {
            throw new HTTPException(400, { message: 'No key provided' });
        }
        if (presignedRequests.has(key) === false) {
            throw new HTTPException(400, { message: 'No such key' });
        }
        presignedRequests.delete(key);
        return c.json({
            status: true,
        });
    });


export { router as previewImagesRouter };