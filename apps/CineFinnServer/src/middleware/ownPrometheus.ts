import { prometheus } from '@hono/prometheus'
import { createMiddleware } from 'hono/factory';
import { basicAuth } from 'hono/basic-auth'
import { Gauge, Registry } from 'prom-client'
import { watchableEntitysTable } from '../database.js';
import { generateOverview } from '../routes/admin/admin.js';
import { getConfig } from '../config.js';
import { Hono, type Context } from 'hono';

const prefix = getConfig().prometheus.METRICS_PREFIX;

const registry = new Registry()
const watchableEntitiesGauge = new Gauge({
    name: prefix + 'watchable_entities_gauge',
    help: 'The amount of watchable entities',
    registers: [registry],
})
const seriesGauge = new Gauge({
    name: prefix + 'series_gauge',
    help: 'The amount of series',
    registers: [registry],
})
const seasonsGauge = new Gauge({
    name: prefix + 'seasons_gauge',
    help: 'The amount of seasons',
    registers: [registry],
})
const episodesGauge = new Gauge({
    name: prefix + 'episodes_gauge',
    help: 'The amount of episodes',
    registers: [registry],
})
const moviesGauge = new Gauge({
    name: prefix + 'movies_gauge',
    help: 'The amount of movies',
    registers: [registry],
})
const accountsGauge = new Gauge({
    name: prefix + 'accounts_gauge',
    help: 'The amount of accounts',
    registers: [registry],
})
const runtimeGauge = new Gauge({
    name: prefix + 'runtime_gauge',
    help: 'The runtime of all watchable entities in seconds',
    registers: [registry],
})
const watchHistoryEntrysGauge = new Gauge({
    name: prefix + 'watch_history_entrys_gauge',
    help: 'The amount of watch history entries',
    registers: [registry],
})

const { registerMetrics: internalRegisterMetrics } = prometheus({
    registry,
    collectDefaultMetrics: true,
    prefix,
});


const registerMetrics = createMiddleware(async (c, next) => {
    if (getConfig().prometheus.ENABLED == false) {
        return next();
    }
    return internalRegisterMetrics(c, next);
});

const metricsRouter = new Hono()
    .get('/metrics', basicAuth(getConfig().prometheus.basicAuth), async (c) => {
        if (getConfig().prometheus.ENABLED == false) {
            return c.text('Prometheus Metrics are disabled');
        }
        const overview = await generateOverview();
        watchableEntitiesGauge.set(await watchableEntitysTable.count());
        seriesGauge.set(overview.series);
        seasonsGauge.set(overview.seasons);
        episodesGauge.set(overview.episodes);
        moviesGauge.set(overview.movies);
        accountsGauge.set(overview.accounts);
        runtimeGauge.set(overview.totalRuntime);
        watchHistoryEntrysGauge.set(overview.watchHistoryEntrys);
        return c.text(await registry.metrics());
    })

export { registry, metricsRouter, registerMetrics };