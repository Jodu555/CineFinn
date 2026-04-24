import { tryCatch } from "@cinefinn/utilities/tryCatch";
import { Hono } from "hono";
import { proxy } from 'hono/proxy';
import { getConfig } from "../config.js";

const router = new Hono()
    .all('/anidb/*', async (c) => {
        const proxyURL = `${getConfig().proxyAPIs.anidbapi.url}${c.req.path || ''}`
        // console.log('Proxying to:', proxyURL);
        const res = await proxy(
            proxyURL,
            {
                method: c.req.method,
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
    .all('/bullboard/*', async (c) => {
        const param = c.req.url.split('?')[1];
        const proxyURL = `${getConfig().proxyAPIs.bullboardapi.url}/admin/queues/api${c.req.path.replace('bullboard/', '') || ''}?${param || ''}`
        // console.log('Proxying to:', proxyURL);
        const { data: res, error } = await tryCatch<Promise<Response>, Error>(() => proxy(
            proxyURL,
            {
                method: c.req.method,
                headers: {
                    ...c.req.header(),
                    'X-Forwarded-Host': c.req.header('host'),
                    'token': getConfig().proxyAPIs.bullboardapi.apiToken,
                },
            }
        ));
        if (error) {
            console.log(error);
            return c.json({
                status: false,
                message: 'Error proxying request',
            });
        }
        res.headers.delete('Set-Cookie')
        res.headers.delete('x-powered-by')
        return res
    })

export { router as proxyRouter };
