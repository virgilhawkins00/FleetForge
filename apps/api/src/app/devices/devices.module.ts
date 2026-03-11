import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService } from './device-lifecycle.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DevicesController, DeviceLifecycleController],
  providers: [DevicesService, DeviceLifecycleService],
  exports: [DevicesService, DeviceLifecycleService],
})
export class DevicesModule {}
