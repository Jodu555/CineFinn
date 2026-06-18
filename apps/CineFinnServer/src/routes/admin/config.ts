import { Hono } from "hono";
import { authFullMiddleware } from "../../middleware/auth.js";
import { getConfig, updateConfig } from "../../config.js";
import { Role } from "@cinefinn/types";
import { HTTPException } from "hono/http-exception";
import z from "zod";

function redactConfig(config: ReturnType<typeof getConfig>): ReturnType<typeof getConfig> {
    const redactedConfig = JSON.parse(JSON.stringify(config));
    redactedConfig.smtp.auth.pass = 'REDACTED';
    redactedConfig.database.password = 'REDACTED';
    return redactedConfig;
}

export const configRouter = new Hono()
    .get('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const config = getConfig();
        const redactedConfig = redactConfig(config);
        return c.json(redactedConfig);
    })
    .post('/', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const configChangeBody = z.object({
            key: z.string(),
            value: z.any(),
        });
        const body = await c.req.json();

        const configChange = configChangeBody.parse(body);

        //key with dot notation to the actual walking

        const config = getConfig();


        const blockedKeys = ['version', 'system.PORT', 'system.PUBLIC_API_ENDPOINT', 'system.PUBLIC_API_AUTH_TOKEN', 'smtp.auth.host', 'smtp.auth.pass', 'database.password'];

        if (blockedKeys.includes(configChange.key)) {
            throw new HTTPException(400, {
                message: 'Operation not supported! (blocked keys)',
            });
        }

        let tempObject = config as any;
        const parts = configChange.key.split('.');
        let i = 0;
        for (const part of parts) {
            if (tempObject[part] == undefined) {
                throw new HTTPException(400, {
                    message: 'Operation not supported (missing/invalid key)',
                });
            }
            if (i == parts.length - 1) {
                tempObject[part] = configChange.value;
            }
            tempObject = tempObject[part];
            i++;
        }
        updateConfig(config);
        return c.json(redactConfig(config));
    })