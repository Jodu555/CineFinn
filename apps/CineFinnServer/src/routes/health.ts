import packageJSON from '../../package.json' with { type: "json" };
import { Hono } from "hono";

const router = new Hono();

router.get('/', async (c) => {
    return c.json({
        status: 'ok',
        version: packageJSON.version,
        motd: {
            show: false,
            type: 'info',
            message: '',
        },
    }, 200);
});


export { router as healthRouter };