import axios from "axios";
import { Hono } from "hono";
import { proxy } from 'hono/proxy'
import { createStorage } from "unstorage";
import fsDriver from 'unstorage/drivers/fs';
import { getConfig } from "../config.js";
import { cacheRegistry } from "./admin/cache.js";

interface ImageRewriteData {
    url: string;
    data: Uint8Array;
    contentType: string;
    lastFetched: number;
}

const imageStorage = createStorage<ImageRewriteData>({
    driver: fsDriver({
        base: './temp/imageStorage',
    })
})

cacheRegistry.set('imageRewrite', imageStorage);

const CACHE_TIME = 1000 * 60 * 60 * 24 * 7;

const router = new Hono()
    .get('/imageRewrite', async (c) => {
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
    .get('/anidb/*', async (c) => {
        const proxyURL = `${getConfig().proxyAPIs.anidbapi.url}${c.req.path || ''}`
        console.log('Proxying to:', proxyURL);
        const res = await proxy(
            proxyURL,
            {
                headers: {
                    ...c.req.header(),
                    'X-Forwarded-Host': c.req.header('host'),
                    Authorization: undefined,
                    'auth-token': '',
                },
            }
        )
        res.headers.delete('Set-Cookie')
        return res
    })
    .get('/bullboard/*', async (c) => {
        const proxyURL = `${getConfig().proxyAPIs.bullboardapi.url}/admin/queues/api${c.req.path.replace('bullboard/', '') || ''}?${c.req.url.split('?')[1]}`
        console.log('Proxying to:', proxyURL);
        const res = await proxy(
            proxyURL,
            {
                headers: {
                    ...c.req.header(),
                    'X-Forwarded-Host': c.req.header('host'),
                    'token': getConfig().proxyAPIs.bullboardapi.apiToken,
                },
            }
        )
        res.headers.delete('Set-Cookie')
        res.headers.delete('x-powered-by')
        return res
    })

export { router as proxyRouter };