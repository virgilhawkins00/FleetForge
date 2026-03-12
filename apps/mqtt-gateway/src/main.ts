/**
 * FleetForge MQTT Gateway
 *
 * High-performance MQTT broker with GCP Pub/Sub bridge for IoT telemetry ingestion.
 *
 * Features:
 * - MQTT 3.1.1 broker (Aedes)
 * - Real-time telemetry bridge to GCP Pub/Sub
 * - Device authentication
 * - HTTP API for management
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const httpPort = process.env.HTTP_PORT || process.env.PORT || 3200;
  const mqttPort = process.env.MQTT_PORT || 1883;

  await app.listen(httpPort);

  Logger.log(
    `
┌─────────────────────────────────────────────────────────┐
│                   FleetForge MQTT Gateway               │
├─────────────────────────────────────────────────────────┤
│  🌐 HTTP API:  http://localhost:${httpPort}/${globalPrefix}                  │
│  📡 MQTT:      mqtt://localhost:${mqttPort}                       │
│  📊 Status:    http://localhost:${httpPort}/${globalPrefix}/mqtt/status       │
└─────────────────────────────────────────────────────────┘
  `,
    'MqttGateway',
  );
}

bootstrap();
