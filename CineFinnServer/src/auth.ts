import { createMiddleware } from 'hono/dist/types/helper/factory/index.js';
import { accountsTable, authTokensTable, type Account } from './database.js';

export async function getUser(token: string) {
    const authToken = await authTokensTable.getOne({
        TOKEN: token,
        unique: true,
    });

    if (authToken == undefined) {
        return null;
    }

    const user = await accountsTable.getOne({
        UUID: authToken.account_UUID,
        unique: true,
    });

    if (user == undefined) {
        return null;
    }

    return user;
}

export const authFullMiddleware = (cb: (user: Account) => boolean) => createMiddleware<{
    Variables: {
        credentials: {
            token: string;
            user: Account;
        };
    };
}>(async (c, next) => {
    const token = c.req.header('auth-token') || c.req.query('auth-token');
    if (token == undefined) {
        c.status(401);
        return c.json({
            error: 'Missing auth-token in headers'
        });
    }

    const user = await getUser(token);

    if (user == undefined) {
        c.status(401);
        return c.json({
            error: 'Invalid auth-token'
        });
    }

    if (!cb(user)) {
        c.status(403);
        return c.json({
            error: 'Insufficent Permission'
        });
    }

    c.set('credentials', {
        token,
        user,
    });
    await next();
});

export const authMiddleware = authFullMiddleware((user) => true);