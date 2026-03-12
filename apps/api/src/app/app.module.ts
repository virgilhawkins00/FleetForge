import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '@fleetforge/database';
import { JwtAuthGuard, SecurityModule } from '@fleetforge/security';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { FirmwareModule } from './firmware/firmware.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { FleetsModule } from './fleets/fleets.module';
import { EventsModule } from './events/events.module';
import { ShadowsModule } from './shadows/shadows.module';
import { FleetOperationsModule } from './fleet-operations/fleet-operations.module';
// Phase 6: Production Readiness modules
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { HttpMetricsInterceptor } from './metrics/http-metrics.interceptor';
import { CacheConfigModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Observability - Logging (must be early for bootstrap logging)
    LoggingModule,
    // Database
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/fleetforge'),
      }),
    }),
    // Security
    SecurityModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        jwt: {
          secret: configService.get<string>('JWT_SECRET', 'fleetforge-dev-secret-key'),
          accessTokenExpiration: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
          refreshTokenExpiration: configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
        },
      }),
    }),
    // Observability - Health Checks & Metrics
    HealthModule,
    MetricsModule,
    // Caching
    CacheConfigModule,
    // Feature modules
    AuthModule,
    DevicesModule,
    FirmwareModule,
    DeploymentsModule,
    TelemetryModule,
    FleetsModule,
    EventsModule,
    ShadowsModule,
    FleetOperationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Auth Guard - requires authentication by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global HTTP Metrics Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
