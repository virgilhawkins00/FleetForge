/**
 * Health Controller
 * Exposes health check endpoints for infrastructure monitoring
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@fleetforge/security';
import { MongoHealthIndicator } from './indicators/mongo.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly mongo: MongoHealthIndicator,
  ) {}

  /**
   * Liveness probe - checks if the application is running
   * Used by Kubernetes to know when to restart a container
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe - check if application is running' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async check() {
    return this.health.check([
      // Check MongoDB connection
      () => this.mongo.isHealthy('mongodb'),
      // Check memory heap usage (max 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Check memory RSS (max 500MB)
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness probe - checks if the application is ready to receive traffic
   * Used by Kubernetes to know when a pod is ready to serve requests
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - check if application is ready to receive traffic' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness() {
    return this.health.check([
      // MongoDB must be connected
      () => this.mongo.isHealthy('mongodb'),
      // Memory check
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Disk check (at least 10% free space on root)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Startup probe - checks during application startup
   * Used by Kubernetes to know when the application has started
   */
  @Get('startup')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Startup probe - check if application has started' })
  @ApiResponse({ status: 200, description: 'Application has started' })
  @ApiResponse({ status: 503, description: 'Application is still starting' })
  async startup() {
    return this.health.check([
      // Only check MongoDB during startup
      () => this.mongo.isHealthy('mongodb'),
    ]);
  }

  /**
   * Detailed health information (protected endpoint)
   */
  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health information (authenticated)' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async detailed() {
    return this.health.check([
      () => this.mongo.isHealthy('mongodb'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}

