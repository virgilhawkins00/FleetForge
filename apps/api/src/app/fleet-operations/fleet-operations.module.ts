/**
 * Fleet Operations Module
 * Handles batch operations across device fleets
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { SecurityModule } from '@fleetforge/security';
import { FleetOperationsController } from './fleet-operations.controller';
import { FleetOperationsService } from './fleet-operations.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    DevicesModule,
  ],
  controllers: [FleetOperationsController],
  providers: [FleetOperationsService],
  exports: [FleetOperationsService],
})
export class FleetOperationsModule {}

