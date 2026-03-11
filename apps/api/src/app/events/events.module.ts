/**
 * Events Module - WebSocket Gateway for real-time communication
 */

import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { DevicesModule } from '../devices/devices.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { ShadowsModule } from '../shadows/shadows.module';

@Module({
  imports: [DevicesModule, TelemetryModule, forwardRef(() => ShadowsModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
