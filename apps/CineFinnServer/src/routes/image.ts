import axios from "axios";
import { Hono } from "hono";
import { createStorage } from "unstorage";
import fsDriver from 'unstorage/drivers/fs';
import { cacheRegistry } from "./admin/cache.js";

interface ImageCacheData {
    url: string;
    data: Uint8Array;
    contentType: string;
    lastFetched: number;
}

const imageStorage = createStorage<ImageCacheData>({
    driver: fsDriver({
        base: './temp/imageStorage',
    })
})

cacheRegistry.set('imageCache', imageStorage);

const CACHE_TIME = 1000 * 60 * 60 * 24 * 7;

const router = new Hono()
    .get('/rewrite', async (c) => {
        const url = c.req.query('url');
        if (url == undefined) {
            return c.json({ status: 'error', message: 'No URL provided' });
        }
        if (await imageStorage.has(url)) {
            const imageData = await imageStorage.get(url);
            if (imageData == undefined) return; // This should never happen just for the typescript compiler

            if (Date.now() - imageData.lastFetched < CACHE_TIME - 1) {

                const data = imageData.data instanceof Uint8Array
                    ? imageData.data
                    : new Uint8Array(Object.values(imageData.data));

                return new Response(data as any, {
                    headers: {
                        'Content-Type': imageData.contentType,
                        'Cache-Control': `public, immutable, max-age=${CACHE_TIME}`,
                        'CACHE-AGE': `${Date.now() - imageData.lastFetched}`,
                    }
                });
            }
        }
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
        });
        if (response.status != 200) {
            return c.json({ status: 'error', message: 'Could not fetch image' });
        }

        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const imageBuffer = Buffer.from(response.data);

        await imageStorage.set(url, {
            url,
            data: new Uint8Array(imageBuffer),
            contentType,
            lastFetched: Date.now(),
        });

        c.header('Content-Type', contentType);
        c.header('Cache-Control', `public, immutable, max-age=${CACHE_TIME}`);

        return c.body(response.data);
    })
    .get('/manipulate', async (c) => {

    });

export { router as imageRouter };
