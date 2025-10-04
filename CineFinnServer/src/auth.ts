import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { accountsTable, authTokensTable, database, type Account } from './database.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';

export async function registerSchemas() {

    const len = {
        min: 3,
    };

    const registerSchema = {
        UUID: {
            value: randomUUID(),
        },
        username: {
            required: true,
            anum: false,
            min: 3,
            max: 15,
        },
        email: {
            email: true,
            ...len,
            max: 20,
        },
        password: {
            required: true,
            ...len,
            max: 100,
        },
        token: {
            min: 10,
            max: 15,
        },
    };

    const loginSchema = {
        username: {
            anum: false,
            max: 15,
            ...len,
        },
        password: {
            ...len,
            max: 100,
        },
    };

    database.registerSchema('registerSchema', registerSchema, 'accounts');
    database.registerSchema('loginSchema', loginSchema, 'accounts');
}

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
        throw new HTTPException(401, {
            message: 'Missing auth-token in headers'
        });
    }

    const user = await getUser(token);

    if (user == undefined) {
        throw new HTTPException(401, {
            message: 'Invalid auth-token'
        });
    }

    if (!cb(user)) {
        throw new HTTPException(403, {
            message: 'Insufficent Permission'
        });
    }

    c.set('credentials', {
        token,
        user,
    });
    await next();
});

export const authMiddleware = authFullMiddleware((user) => true);


export const authRouter = new Hono();

authRouter.post('/login', async (c) => {

    const validation = database.getSchema('loginSchema').validate(await c.req.json(), true);
    const user = validation.object as any;
    const result = await accountsTable.getOne({ username: user.username, unique: true });
    if (result == undefined) {
        const value = user.username ? 'username' : 'email';
        throw new HTTPException(401, {
            message: `Invalid ${value}!`
        });
    }
    if (await bcrypt.compare(user.password, result.password!) == false) {
        throw new HTTPException(401, {
            message: 'Invalid password!'
        });
    }

    const authToken = randomUUID();
    delete result.password;
    await authTokensTable.create({
        TOKEN: authToken,
        account_UUID: result.UUID,
    });

    return c.json({
        token: authToken,
    });

});

authRouter.post('/register', async (c) => {
    const validation = database.getSchema('registerSchema').validate(await c.req.json(), true);
    const user = validation.object as any;

    const registerToken = user.token;
    delete user.token;

    if (registerToken != process.env.REGISTRATION_TOKEN) {
        throw new HTTPException(401, {
            message: 'Invalid Registration Token!'
        });
    }
    const search = { ...user }; //Spreading to disable the reference
    delete search.password;


    search.unique = false;
    const result = await accountsTable.getOne({ username: search.username, unique: true });
    console.log(search, result);

    if (result !== undefined) {
        throw new HTTPException(400, {
            message: 'The email or the username is already taken!'
        });
    }

    user.password = await bcrypt.hash(user.password, 8);

    await accountsTable.create({
        ...user,
        email: `${user.username}@nil.com`,
        activityDetails: {
            lastHandshake: new Date().toLocaleString('de'),
            lastLogin: new Date().toLocaleString('de'),
        },
        settings: {},
        role: 1,
        status: 'trial',
    });
    delete user.password;
    return c.json(user);
});

authRouter.get('/logout', authMiddleware, async (c) => {
    await authTokensTable.delete({
        TOKEN: c.get('credentials').token,
        account_UUID: c.get('credentials').user.UUID,
    });
    return c.json({
        message: 'Successfully logged out',
    });
});

authRouter.get('/info', authMiddleware, async (c) => {
    return c.json(c.get('credentials').user);
});
