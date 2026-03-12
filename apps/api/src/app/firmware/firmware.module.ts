import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@fleetforge/database';
import { FirmwareController } from './firmware.controller';
import { FirmwareService } from './firmware.service';
import { StorageService } from './services/storage.service';
import { FirmwareValidationService } from './services/firmware-validation.service';
import { GCPFirmwareService } from '../gcp/gcp-firmware.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [FirmwareController],
  providers: [
    FirmwareService,
    StorageService,
    FirmwareValidationService,
    GCPFirmwareService,
    // Provide GCP_ENABLED as false by default for standalone usage
    // When GcpModule is imported globally, it will override this
    { provide: 'GCP_ENABLED', useValue: false },
  ],
  exports: [FirmwareService, StorageService, FirmwareValidationService],
})
export class FirmwareModule {}
