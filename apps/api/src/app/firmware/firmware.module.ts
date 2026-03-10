import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { FirmwareController } from './firmware.controller';
import { FirmwareService } from './firmware.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FirmwareController],
  providers: [FirmwareService],
  exports: [FirmwareService],
})
export class FirmwareModule {}
