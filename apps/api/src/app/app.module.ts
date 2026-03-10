import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@fleetforge/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
    DevicesModule,
    FirmwareModule,
    DeploymentsModule,
    TelemetryModule,
    FleetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
