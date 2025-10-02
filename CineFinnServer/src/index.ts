import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import { connectDatabase, database } from './database.js';
import { crawl } from './crawler.js';
dotenv.config();



const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

serve({
  fetch: app.fetch,
  port: 3000
}, async (info) => {
  await connectDatabase();
  console.log(`Server is running on http://localhost:${info.port}`);
  // await crawl();
});
