import axios from "axios";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import fsDriver from 'unstorage/drivers/fs';
import { cacheRegistry } from "./admin/cache.js";
import { buildCacheKey, parseParams, processImage } from "../utils/imageTransform.js";

interface ImageCacheData {
    url: string;
    data: Uint8Array;
    contentType: string;
    lastFetched: number;
}

interface ImageTransformData {
    /** Base64-encoded image buffer */
    data: string;
    contentType: string;
    createdAt: number;
    ttlMs: number;
}

const imageStorage = createStorage<ImageCacheData>({
    driver: fsDriver({
        base: './temp/imageStorage',
    })
})

const imageRewriteStorage = prefixStorage<ImageCacheData>(imageStorage, 'imageRewrite');
const imageTransformStorage = prefixStorage<ImageTransformData>(imageStorage, 'imageTransform');

cacheRegistry.set('imageCache', imageStorage);
cacheRegistry.set('imageRewriteCache', imageRewriteStorage);
cacheRegistry.set('imageTransformCache', imageTransformStorage);

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
    .get('/transform', async (c) => {
        const query = c.req.query() as Record<string, string>;

        let params;
        try {
            params = parseParams(query);
        } catch (err: any) {
            return c.json({ error: err.message }, 400);
        }

        const cacheKey = buildCacheKey(params);
        const skipCache = query["no-cache"] === "true" || query["no-cache"] === "1";


        if (!skipCache) {
            const cachedItem = await imageTransformStorage.getItem(cacheKey);

            if (cachedItem && Date.now() - cachedItem.createdAt < cachedItem.ttlMs) {
                return new Response(Buffer.from(cachedItem.data, "base64") as any, {
                    headers: {
                        "Content-Type": cachedItem.contentType,
                        "X-Cache": "HIT",
                        "Cache-Control": "public, max-age=3600",
                    },
                });

            }
        }

        // ── Process image ─────────────────────────────────────────────────────────
        let result: { buffer: Buffer; contentType: string };
        try {
            result = await processImage(params);
        } catch (err: any) {
            return c.json({ error: err.message }, 422);
        }

        await imageTransformStorage.setItem(cacheKey, {
            data: result.buffer.toString('base64'),
            contentType: result.contentType,
            createdAt: Date.now(),
            ttlMs: CACHE_TIME,
        });

        return new Response(result.buffer as any, {
            headers: {
                "Content-Type": result.contentType,
                "X-Cache": "MISS",
                "Cache-Control": "public, max-age=3600",
            },
        });
    });

export { router as imageRouter };
