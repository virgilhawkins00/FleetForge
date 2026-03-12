/**
 * Health Module
 * Provides health check endpoints for Kubernetes/Cloud Run readiness and liveness probes
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MongoHealthIndicator } from './indicators/mongo.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [MongoHealthIndicator],
})
export class HealthModule {}

