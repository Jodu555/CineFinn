import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { accountsTable, authTokensTable, database, emailsTable, } from './database.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import z from 'zod';
import type { Account } from '@cinefinn/types/database';
import { getConfig } from './config.js';
import { compareSettings, defaultSettings } from './utils/settings.js';
import { getEmailManager } from './utils.js';
import type { DataType } from './utils/EmailManager.js';

const registerLoginSchema = z.object({
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
    email: z.email(),
    verificationCode: z.string().min(4).max(6).trim(),
});

const fotgotPasswordSchemaStage1 = z.object({
    email: z.email(),
});

const fotgotPasswordSchemaStage2 = z.object({
    email: z.email(),
    token: z.string().min(5).max(15),
});

const fotgotPasswordSchemaStage3 = z.object({
    email: z.email(),
    token: z.string().min(5).max(15),
    newPassword: z.string().min(4).max(128).trim(),
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


export const authRouter = new Hono()
    .post('/login', async (c) => {
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

        const userUUID = randomUUID();
        await accountsTable.create({
            UUID: userUUID,
            ...user,
            email: user.username + '@nil.com',
            activityDetails: {
                lastHandshake: new Date().toLocaleString('de'),
                lastLogin: new Date().toLocaleString('de'),
            },
            settings: defaultSettings,
            role: 1,
            status: 'trial',
            emailVerifyCode: '',
        });
        delete (user as any).password;
        const authToken = randomUUID();
        await authTokensTable.create({
            TOKEN: authToken,
            account_UUID: userUUID,
        });

        return c.json({
            token: authToken,
            user,
        });
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
        const emailVerifyCode = Math.floor(1000 + Math.random() * 99000).toString();
        await accountsTable.update({ UUID: user.UUID }, { email: onboardingData.email, emailVerifyCode });
        await getEmailManager().sendEmail(user.UUID, 'VERIFICATION', { verificationToken: emailVerifyCode });
        return c.json({
            message: 'Successfully updated email',
        });
    }).post('/onboarding/stepTwo', authMiddleware, async (c) => {
        const jsonBody = await c.req.json();
        const onboardingData = onboardingSchemaStepTwo.parse(jsonBody);
        const user = c.get('credentials').user;
        if (user.email !== onboardingData.email) {
            throw new HTTPException(400, {
                message: 'Email does not match!',
            });
        }
        if (user.emailVerifyCode !== onboardingData.verificationCode) {
            throw new HTTPException(400, {
                message: 'Invalid verification code!',
            });
        }
        await accountsTable.update({ UUID: user.UUID }, { status: 'active', emailVerifyCode: '' });
        return c.json({
            message: 'Successfully updated verification code',
        });
    }).post('/forgotPassword', async (c) => {
        const jsonBody = await c.req.json();
        const forgotPasswordData = fotgotPasswordSchemaStage1.parse(jsonBody);
        const user = await accountsTable.getOne({ email: forgotPasswordData.email, unique: true });
        if (user == undefined) {
            throw new HTTPException(400, {
                message: 'Invalid email!',
            });
        }
        const forgotPasswordToken = Math.floor(1000 + Math.random() * 999999).toString();
        await getEmailManager().sendEmail(user.UUID, 'PASSWORD_RESET', { forgotPasswordToken: forgotPasswordToken });
        return c.json({
            message: 'Successfully sent reset token',
        });
    }).put('/forgotPassword', async (c) => {
        const jsonBody = await c.req.json();
        const forgotPasswordData = fotgotPasswordSchemaStage2.parse(jsonBody);
        const user = await accountsTable.getOne({ email: forgotPasswordData.email, unique: true });
        if (user == undefined) {
            throw new HTTPException(400, {
                message: 'Invalid email!',
            });
        }

        const emails = await emailsTable.get({
            account_UUID: user.UUID,
            email_type: 'PASSWORD_RESET',
            unique: true,
        });

        emails.sort((a, b) => b.sent_at - a.sent_at);

        if (emails.length == 0 || emails[0].data == '') {
            throw new HTTPException(400, {
                message: 'No reset token found, please request a new one!',
            });
        }

        const emailData = emails[0].data as any as DataType<'PASSWORD_RESET'>;

        if (emailData.forgotPasswordToken !== forgotPasswordData.token) {
            throw new HTTPException(400, {
                message: 'Invalid reset token!',
            });
        }
        return c.json({
            message: 'Valid reset token',
        });
    }).patch('/forgotPassword', async (c) => {
        const jsonBody = await c.req.json();
        const forgotPasswordData = fotgotPasswordSchemaStage3.parse(jsonBody);
        const user = await accountsTable.getOne({ email: forgotPasswordData.email, unique: true });
        if (user == undefined) {
            throw new HTTPException(400, {
                message: 'Invalid email!',
            });
        }

        const emails = await emailsTable.get({
            account_UUID: user.UUID,
            email_type: 'PASSWORD_RESET',
            unique: true,
        });

        emails.sort((a, b) => b.sent_at - a.sent_at);

        if (emails.length == 0 || emails[0].data == '') {
            throw new HTTPException(400, {
                message: 'No reset token found, please request a new one!',
            });
        }

        const emailData = emails[0].data as any as DataType<'PASSWORD_RESET'>;

        if (emailData.forgotPasswordToken !== forgotPasswordData.token) {
            throw new HTTPException(400, {
                message: 'Invalid reset token!',
            });
        }
        const newPassword = await bcrypt.hash(forgotPasswordData.newPassword, 8);
        await accountsTable.update({ UUID: user.UUID }, {
            password: newPassword,
        });
        return c.json({
            message: 'Successfully reset password',
        });
    });