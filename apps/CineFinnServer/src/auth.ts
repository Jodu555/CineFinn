import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { accountsTable, authTokensTable, database, } from './database.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import z from 'zod';
import type { Account } from '@cinefinn/types/database';
import { getConfig } from './config.js';
import { compareSettings, defaultSettings } from './utils/settings.js';

const registerLoginSchema = z.object({
    email: z.email(),
    username: z.string().min(3).max(15).trim().regex(/^[a-zA-Z0-9]+$/, {
        message: "Muss nur alphanumerische Zeichen enthalten.",
    }),
    password: z.string().min(4).max(128).trim(),
    token: z.string().min(5).max(15).optional(),
});

const loginSchema = z.object({
    username: z.string().min(3).max(15).trim().regex(/^[a-zA-Z0-9]+$/, {
        message: "Muss nur alphanumerische Zeichen enthalten.",
    }),
    password: z.string().min(4).max(128).trim(),
});

const onboardingSchemaStepOne = z.object({
    email: z.email(),
});

const onboardingSchemaStepTwo = z.object({
    verificationCode: z.string().min(4).max(6).trim(),
});

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

    user.settings = compareSettings(user.settings);
    return user;
}

export interface AuthedVars {
    Variables: {
        credentials: {
            token: string;
            user: Account;
        };
    };
}

export const authFullMiddleware = (cb: (user: Account) => boolean) => createMiddleware<AuthedVars>(async (c, next) => {
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


export const authRouter = new Hono().post('/login', async (c) => {
    const jsonBody = await c.req.json();
    const registerData = loginSchema.parse(jsonBody);
    const user = registerData;
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

}).post('/register', async (c) => {
    const jsonBody = await c.req.json();
    const registerData = registerLoginSchema.parse(jsonBody);

    const user = registerData;

    const registerToken = user.token;
    delete user.token;

    if (registerToken != getConfig().registration.token) {
        throw new HTTPException(401, {
            message: 'Invalid Registration Token!'
        });
    }
    const search = { ...user }; //Spreading to disable the reference

    const result = await accountsTable.getOne({ username: search.username, unique: true });
    console.log(search, result);

    if (result !== undefined) {
        throw new HTTPException(400, {
            message: 'The email or the username is already taken!'
        });
    }

    user.password = await bcrypt.hash(user.password, 8);

    delete (user as any).token;

    await accountsTable.create({
        UUID: randomUUID(),
        ...user,
        activityDetails: {
            lastHandshake: new Date().toLocaleString('de'),
            lastLogin: new Date().toLocaleString('de'),
        },
        settings: defaultSettings,
        role: 1,
        status: 'trial',
    });
    delete (user as any).password;
    return c.json(user);
}).get('/logout', authMiddleware, async (c) => {
    await authTokensTable.delete({
        TOKEN: c.get('credentials').token,
        account_UUID: c.get('credentials').user.UUID,
    });
    return c.json({
        message: 'Successfully logged out',
    });
}).get('/info', authMiddleware, async (c) => {
    return c.json(c.get('credentials').user);
}).post('/onboarding/stepOne', authMiddleware, async (c) => {
    const jsonBody = await c.req.json();
    const onboardingData = onboardingSchemaStepOne.parse(jsonBody);
    const user = c.get('credentials').user;
    user.email = onboardingData.email;
    await accountsTable.update({ UUID: user.UUID }, { email: onboardingData.email });
    //TODO: Send Verification Email
    return c.json({
        message: 'Successfully updated email',
    });
}).post('/onboarding/stepTwo', authMiddleware, async (c) => {
    const jsonBody = await c.req.json();
    const onboardingData = onboardingSchemaStepTwo.parse(jsonBody);
    const user = c.get('credentials').user;
    return c.json({
        message: 'Successfully updated verification code',
    });
});