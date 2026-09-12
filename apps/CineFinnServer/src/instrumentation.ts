import { NodeSDK } from '@opentelemetry/sdk-node'
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';
import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { getConfig } from './config.js';

const config = getConfig();

import packageJson from '../package.json' with { type: 'json' };

const sdk = new NodeSDK({
    serviceName: packageJson.name,
    traceExporter: new ZipkinExporter({
        url: config.openTelemetry.tracing.url
    }),
    instrumentations: [
        new SocketIoInstrumentation({
            enabled: true,
            emitHook: (span, info) => {
                const originalName = (span as any).name
                span.updateName(`socket.io ${originalName}`)
                span.setAttribute('messaging.socket.io.payload', JSON.stringify(info.payload))
            }
        }),
        new MySQLInstrumentation({
            enabled: true,
            enhancedDatabaseReporting: true,
        }),
        new IORedisInstrumentation({
            enabled: true,
        }),
    ],
})

sdk.start()

process.once('SIGTERM', async () => {
    await sdk.shutdown()
})

process.once('SIGINT', async () => {
    await sdk.shutdown()
})
