/**
 * Tracing Module
 * OpenTelemetry distributed tracing for observability
 *
 * Supports exporters:
 * - Jaeger (default for development)
 * - OTLP HTTP (for production - Grafana Tempo, etc.)
 * - Console (for debugging)
 */

import { Module, Global, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { IncomingMessage } from 'http';

export class TracingService implements OnModuleDestroy {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK | null = null;

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    const enabled = this.configService.get<string>('TRACING_ENABLED', 'true') === 'true';

    if (!enabled) {
      this.logger.log('Tracing is disabled');
      return;
    }

    const serviceName = this.configService.get<string>('SERVICE_NAME', 'fleetforge-api');
    const serviceVersion = this.configService.get<string>('APP_VERSION', '0.1.0');
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const exporterType = this.configService.get<string>('TRACING_EXPORTER', 'jaeger');

    // Create resource with service metadata
    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    });

    // Configure exporter based on environment
    const spanProcessor = this.createSpanProcessor(exporterType);

    // Initialize OpenTelemetry SDK
    this.sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation (too noisy)
          '@opentelemetry/instrumentation-fs': { enabled: false },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (request: IncomingMessage) => {
              const ignorePaths = ['/health', '/metrics', '/ready', '/live'];
              return ignorePaths.some((path) => request.url?.includes(path));
            },
          },
        }),
      ],
    });

    try {
      await this.sdk.start();
      this.logger.log(`Tracing initialized with ${exporterType} exporter`);
      this.logger.log(`Service: ${serviceName} v${serviceVersion} (${environment})`);
    } catch (error) {
      this.logger.error('Failed to initialize tracing', error);
    }
  }

  private createSpanProcessor(exporterType: string): BatchSpanProcessor {
    let exporter;

    switch (exporterType.toLowerCase()) {
      case 'jaeger':
        const jaegerEndpoint = this.configService.get<string>(
          'JAEGER_ENDPOINT',
          'http://localhost:14268/api/traces',
        );
        exporter = new JaegerExporter({ endpoint: jaegerEndpoint });
        this.logger.debug(`Jaeger exporter configured: ${jaegerEndpoint}`);
        break;

      case 'otlp':
        const otlpEndpoint = this.configService.get<string>(
          'OTLP_ENDPOINT',
          'http://localhost:4318/v1/traces',
        );
        exporter = new OTLPTraceExporter({ url: otlpEndpoint });
        this.logger.debug(`OTLP exporter configured: ${otlpEndpoint}`);
        break;

      case 'console':
        exporter = new ConsoleSpanExporter();
        this.logger.debug('Console exporter configured');
        break;

      default:
        this.logger.warn(`Unknown exporter type: ${exporterType}, falling back to console`);
        exporter = new ConsoleSpanExporter();
    }

    return new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.logger.log('Tracing shutdown complete');
      } catch (error) {
        this.logger.error('Error shutting down tracing', error);
      }
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: TracingService,
      useFactory: async (configService: ConfigService) => {
        const tracingService = new TracingService(configService);
        await tracingService.initialize();
        return tracingService;
      },
      inject: [ConfigService],
    },
  ],
  exports: [TracingService],
})
export class TracingModule {}
