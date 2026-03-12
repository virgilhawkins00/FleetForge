import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MqttBrokerService, ConnectedClient } from './mqtt-broker.service';
import { MqttBridgeService, BridgeStats } from './mqtt-bridge.service';

export interface PublishCommandDto {
  topic: string;
  payload: string;
}

export interface GatewayStatus {
  status: 'online' | 'offline';
  connectedClients: number;
  gcpBridgeEnabled: boolean;
  bridgeStats: BridgeStats;
  uptime: number;
}

@Controller('mqtt')
export class MqttController {
  private readonly startTime = Date.now();

  constructor(
    private readonly brokerService: MqttBrokerService,
    private readonly bridgeService: MqttBridgeService,
  ) {}

  /**
   * Get MQTT Gateway status
   */
  @Get('status')
  getStatus(): GatewayStatus {
    return {
      status: 'online',
      connectedClients: this.brokerService.getClientCount(),
      gcpBridgeEnabled: this.bridgeService.isEnabled(),
      bridgeStats: this.bridgeService.getStats(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * List connected MQTT clients
   */
  @Get('clients')
  getConnectedClients(): ConnectedClient[] {
    return this.brokerService.getConnectedClients();
  }

  /**
   * Get specific client info
   */
  @Get('clients/:clientId')
  getClient(@Param('clientId') clientId: string): ConnectedClient | null {
    const clients = this.brokerService.getConnectedClients();
    return clients.find(c => c.clientId === clientId) || null;
  }

  /**
   * Publish command to a device
   */
  @Post('devices/:deviceId/command')
  @HttpCode(HttpStatus.ACCEPTED)
  publishCommand(
    @Param('deviceId') deviceId: string,
    @Body() dto: PublishCommandDto,
  ): { success: boolean; deviceId: string } {
    this.brokerService.publishToDevice(deviceId, dto.topic, dto.payload);
    return { success: true, deviceId };
  }

  /**
   * Get bridge statistics
   */
  @Get('bridge/stats')
  getBridgeStats(): BridgeStats & { enabled: boolean } {
    return {
      ...this.bridgeService.getStats(),
      enabled: this.bridgeService.isEnabled(),
    };
  }
}

