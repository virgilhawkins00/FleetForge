/**
 * Metrics Module
 * Prometheus metrics for observability and monitoring
 */

import { Module, Global } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

// HTTP Request metrics
const httpRequestsTotal = makeCounterProvider({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestDuration = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Device metrics
const devicesTotal = makeGaugeProvider({
  name: 'fleetforge_devices_total',
  help: 'Total number of devices',
  labelNames: ['status', 'fleet_id'],
});

const deviceConnectionsActive = makeGaugeProvider({
  name: 'fleetforge_device_connections_active',
  help: 'Number of active device connections (WebSocket)',
});

// Deployment metrics
const deploymentsTotal = makeCounterProvider({
  name: 'fleetforge_deployments_total',
  help: 'Total number of deployments',
  labelNames: ['status', 'strategy'],
});

const deploymentDuration = makeHistogramProvider({
  name: 'fleetforge_deployment_duration_seconds',
  help: 'Deployment duration in seconds',
  labelNames: ['strategy', 'status'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
});

// Telemetry metrics
const telemetryMessagesTotal = makeCounterProvider({
  name: 'fleetforge_telemetry_messages_total',
  help: 'Total number of telemetry messages received',
  labelNames: ['device_id'],
});

const telemetryProcessingDuration = makeHistogramProvider({
  name: 'fleetforge_telemetry_processing_seconds',
  help: 'Telemetry processing duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
});

// Firmware metrics
const firmwareDownloadsTotal = makeCounterProvider({
  name: 'fleetforge_firmware_downloads_total',
  help: 'Total number of firmware downloads',
  labelNames: ['version', 'device_type'],
});

// AI/ML metrics
const anomaliesDetectedTotal = makeCounterProvider({
  name: 'fleetforge_anomalies_detected_total',
  help: 'Total number of anomalies detected',
  labelNames: ['type', 'severity', 'device_id'],
});

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'fleetforge_',
        },
      },
    }),
  ],
  providers: [
    httpRequestsTotal,
    httpRequestDuration,
    devicesTotal,
    deviceConnectionsActive,
    deploymentsTotal,
    deploymentDuration,
    telemetryMessagesTotal,
    telemetryProcessingDuration,
    firmwareDownloadsTotal,
    anomaliesDetectedTotal,
  ],
  exports: [
    PrometheusModule,
    httpRequestsTotal,
    httpRequestDuration,
    devicesTotal,
    deviceConnectionsActive,
    deploymentsTotal,
    deploymentDuration,
    telemetryMessagesTotal,
    telemetryProcessingDuration,
    firmwareDownloadsTotal,
    anomaliesDetectedTotal,
  ],
})
export class MetricsModule {}

