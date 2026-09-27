import { NodeSDK } from '@opentelemetry/sdk-node'
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SocketIoInstrumentation, type SocketIoHookInfo } from '@opentelemetry/instrumentation-socket.io';
import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getConfig } from './config.js';

const config = getConfig();

import packageJson from '../package.json' with { type: 'json' };
import type { Span } from '@opentelemetry/api';

if (config.openTelemetry.tracing.enabled == false) {
    console.log('OpenTelemetry Tracing is disabled');
} else {

    const socketIOHookMangleFunction = (span: Span, info: SocketIoHookInfo) => {
        const originalName = (span as any).name as string;
        const attributes = (span as any).attributes as Record<string, any>;
        span.updateName(`socket.io ${originalName} ${attributes['messaging.socket.io.event_name']}`);
        span.setAttribute('messaging.socket.io.payload', JSON.stringify(info.payload))
    };

    const sdk = new NodeSDK({
        serviceName: packageJson.name,
        traceExporter: config.openTelemetry.tracing.tracer === 'otlp' ? new OTLPTraceExporter({
            url: config.openTelemetry.tracing.url,
        }) : config.openTelemetry.tracing.tracer === 'zipkin' ? new ZipkinExporter({
            url: config.openTelemetry.tracing.url,
        }) : undefined,
        instrumentations: [
            new SocketIoInstrumentation({
                enabled: true,
                emitHook: socketIOHookMangleFunction,
                onHook: socketIOHookMangleFunction,
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
}

