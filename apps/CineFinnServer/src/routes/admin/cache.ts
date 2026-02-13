import { Hono } from 'hono';
import type { Storage } from 'unstorage';
import { authFullMiddleware } from '../../middleware/auth.js';
import { Role } from '@cinefinn/types/database';

export const cacheRegistry = new Map<string, Storage<any>>();

export const cacheRoutes = new Hono()
    .get('/caches', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const names = Array.from(cacheRegistry.keys());
        return c.json(names);
    })
    .get('/caches/:name/keys', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const name = c.req.param('name');
        const storage = cacheRegistry.get(name);

        if (!storage) {
            return c.json({
                status: 'error',
                message: `Cache "${name}" not found in registry.`,
            }, 404);
        }

        const keys = await storage.getKeys();
        return c.json({
            status: 'success',
            data: keys,
        });
    })
    .get('/caches/:name/items/:key{.*}', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const name = c.req.param('name');
        const key = c.req.param('key');

        const storage = cacheRegistry.get(name);
        if (!storage) {
            return c.json({
                status: 'error',
                message: 'Cache not found',
            }, 404);
        }

        const item = await storage.getItem(key);

        // Unstorage returns null if not found usually, but we return 404 for a REST API feel
        if (item === null || item === undefined) {
            return c.json({
                status: 'error',
                message: 'Item not found',
            }, 404);
        }

        return c.json({
            status: 'success',
            data: item,
        });
    })
    .post('/caches/:name/items/:key{.*}', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const name = c.req.param('name');
        const key = c.req.param('key');
        const storage = cacheRegistry.get(name);

        if (!storage) {
            return c.json({
                status: 'error',
                message: 'Cache not found',
            }, 404);
        }

        try {
            // We assume the client sends the raw JSON value to be stored
            const value = await c.req.json();
            await storage.setItem(key, value);

            return c.json({
                status: 'success',
                message: 'Item saved',
            });
        } catch (err) {
            return c.json({
                status: 'error',
                message: 'Invalid JSON body',
            }, 400);
        }
    })
    .delete('/caches/:name/items/:key{.*}', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const name = c.req.param('name');
        const key = c.req.param('key');
        const storage = cacheRegistry.get(name);

        if (!storage) {
            return c.json({
                status: 'error',
                message: 'Cache not found',
            }, 404);
        }

        await storage.removeItem(key);

        return c.json({
            status: 'success',
            message: 'Item deleted',
        });
    })
    .delete('/caches/:name', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const name = c.req.param('name');
        const storage = cacheRegistry.get(name);

        if (!storage) {
            return c.json({
                status: 'error',
                message: 'Cache not found',
            }, 404);
        }

        // Clears all keys in this storage instance
        await storage.clear();

        return c.json({
            status: 'success',
            message: `Cache "${name}" cleared`,
        });
    });