import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import { connectDatabase, database, seriesTable, type Series } from './database.js';
import { crawl } from './crawler.js';
dotenv.config();
import { proxy } from 'hono/proxy';
import { trimTrailingSlash } from 'hono/trailing-slash';



const app = new Hono({
  strict: false,
});
app.use(trimTrailingSlash());

app.get('/index', async (c) => {
  return c.json(await seriesTable.get());
});

app.get('*', async (c, next) => {

  const proxyables = [
    '/index/all',
  ];

  if (!proxyables.includes(c.req.path)) {
    return next();
  }

  console.log('Came', c.req.path);

  const queryString = c.req.url.split('?')[1];

  const newUrl = `http://localhost:3100${c.req.path}?${queryString}`;

  return proxy(newUrl);
});

serve({
  fetch: app.fetch,
  port: 3000
}, async (info) => {
  await connectDatabase();
  console.log(`Server is running on http://localhost:${info.port}`);
  // await crawl();
});
