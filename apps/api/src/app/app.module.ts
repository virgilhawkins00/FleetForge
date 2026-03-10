import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

