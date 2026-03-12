import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttBrokerService } from './mqtt-broker.service';
import { MqttBridgeService } from './mqtt-bridge.service';
import { MqttController } from './mqtt.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MqttController],
  providers: [MqttBrokerService, MqttBridgeService],
  exports: [MqttBrokerService, MqttBridgeService],
})
export class MqttModule {}

