import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import { connectDatabase, database, seriesTable, type Series } from './database.js';
import { crawl } from './crawler.js';
dotenv.config();



const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

// function preffifySeries(series: Series) {
//   return {
//     ...series,
//     infos: JSON.parse(series.infos),
//     refs: JSON.parse(series.refs),
//     tags: JSON.parse(series.tags),
//   };
// }

app.get('/index/', async (c) => {
  return c.json(await seriesTable.get());
  // return c.json((await seriesTable.get()).map(preffifySeries));
});

serve({
  fetch: app.fetch,
  port: 3000
}, async (info) => {
  await connectDatabase();
  console.log(`Server is running on http://localhost:${info.port}`);
  // await crawl();
});
