import { Hono } from "hono";
import { filenameParser } from "../../parser.js";
import { Role } from "@cinefinn/types";
import { authFullMiddleware } from "../../middleware/auth.js";

export const toolingRouter = new Hono()
    .post('/filenameParser', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const body = await c.req.json();
        const parsed = filenameParser(body.filepath, body.filename);
        return c.json(parsed);
    });