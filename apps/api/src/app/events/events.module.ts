/**
 * Events Module - WebSocket Gateway for real-time communication
 */

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { DevicesModule } from '../devices/devices.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [DevicesModule, TelemetryModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}

