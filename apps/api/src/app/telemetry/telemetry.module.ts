import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { GCPTelemetryService } from '../gcp/gcp-telemetry.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    GCPTelemetryService,
    // Provide GCP_ENABLED as false by default for standalone usage
    // When GcpModule is imported globally, it will override this
    { provide: 'GCP_ENABLED', useValue: false },
  ],
  exports: [TelemetryService],
})
export class TelemetryModule {}
