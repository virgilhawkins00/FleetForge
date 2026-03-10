import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/fleetforge'),
      }),
    }),
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
    AuthModule,
    DevicesModule,
    FirmwareModule,
    DeploymentsModule,
    TelemetryModule,
    FleetsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Auth Guard - requires authentication by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
