import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@fleetforge/database';
import { FirmwareController } from './firmware.controller';
import { FirmwareService } from './firmware.service';
import { StorageService } from './services/storage.service';
import { FirmwareValidationService } from './services/firmware-validation.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [FirmwareController],
  providers: [FirmwareService, StorageService, FirmwareValidationService],
  exports: [FirmwareService, StorageService, FirmwareValidationService],
})
export class FirmwareModule {}
