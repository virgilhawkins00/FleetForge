import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { GCPTelemetryService } from '../gcp/gcp-telemetry.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TelemetryController],
  providers: [TelemetryService, GCPTelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
