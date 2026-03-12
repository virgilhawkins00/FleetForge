import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSubService, TelemetryMessage, DeviceEvent } from '@fleetforge/gcp-integration';

export interface BridgeStats {
  telemetryCount: number;
  eventCount: number;
  errorCount: number;
  lastActivity: Date | null;
}

@Injectable()
export class MqttBridgeService implements OnModuleInit {
  private readonly logger = new Logger(MqttBridgeService.name);
  private readonly enabled: boolean;
  private pubsub: PubSubService | null = null;

  private stats: BridgeStats = {
    telemetryCount: 0,
    eventCount: 0,
    errorCount: 0,
    lastActivity: null,
  };

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('GCP_ENABLED', false);
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('GCP bridge is disabled. Set GCP_ENABLED=true to enable.');
      return;
    }

    try {
      const projectId = this.configService.get<string>('GCP_PROJECT_ID', 'fleetforge-prod');
      const credentials = this.configService.get<string>('GCP_CREDENTIALS');

      this.pubsub = new PubSubService({
        projectId,
        credentials,
        telemetryTopic: this.configService.get<string>(
          'GCP_TELEMETRY_TOPIC',
          'fleetforge-telemetry',
        ),
        commandsTopic: this.configService.get<string>('GCP_COMMANDS_TOPIC', 'fleetforge-commands'),
        eventsTopic: this.configService.get<string>('GCP_EVENTS_TOPIC', 'fleetforge-events'),
      });

      await this.pubsub.initialize();
      this.logger.log('✅ GCP Pub/Sub bridge initialized');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initialize GCP bridge: ${err.message}`);
    }
  }

  /**
   * Bridge MQTT telemetry to GCP Pub/Sub
   */
  async bridgeTelemetry(topic: string, payload: string, clientId: string): Promise<void> {
    if (!this.enabled || !this.pubsub) {
      this.logger.debug('GCP bridge disabled, skipping telemetry');
      return;
    }

    try {
      const data = JSON.parse(payload);
      const deviceId = this.extractDeviceIdFromTopic(topic) || clientId;

      const message: TelemetryMessage = {
        deviceId,
        timestamp: new Date(data.timestamp || Date.now()),
        metrics: data.metrics || data,
        fleetId: data.fleetId,
        metadata: {
          source: 'mqtt-gateway',
          clientId,
          topic,
        },
      };

      await this.pubsub.publishTelemetry(message);
      this.stats.telemetryCount++;
      this.stats.lastActivity = new Date();

      this.logger.debug(`Bridged telemetry from ${deviceId} to GCP`);
    } catch (error) {
      const err = error as Error;
      this.stats.errorCount++;
      this.logger.error(`Failed to bridge telemetry: ${err.message}`);
    }
  }

  /**
   * Bridge MQTT events to GCP Pub/Sub
   */
  async bridgeEvent(topic: string, payload: string, clientId: string): Promise<void> {
    if (!this.enabled || !this.pubsub) return;

    try {
      const data = JSON.parse(payload);
      const deviceId = this.extractDeviceIdFromTopic(topic) || clientId;

      const event: DeviceEvent = {
        deviceId,
        eventType: data.eventType || 'custom',
        timestamp: new Date(data.timestamp || Date.now()),
        data: data.data || data,
      };

      await this.pubsub.publishEvent(event);
      this.stats.eventCount++;
      this.stats.lastActivity = new Date();

      this.logger.debug(`Bridged event from ${deviceId} to GCP`);
    } catch (error) {
      const err = error as Error;
      this.stats.errorCount++;
      this.logger.error(`Failed to bridge event: ${err.message}`);
    }
  }

  /**
   * Publish device connection event
   */
  async publishEvent(eventType: 'connect' | 'disconnect', deviceId: string): Promise<void> {
    if (!this.enabled || !this.pubsub) return;

    try {
      await this.pubsub.publishEvent({
        deviceId,
        eventType,
        timestamp: new Date(),
        data: { source: 'mqtt-gateway' },
      });
      this.stats.eventCount++;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to publish ${eventType} event: ${err.message}`);
    }
  }

  private extractDeviceIdFromTopic(topic: string): string | undefined {
    // Topic format: devices/{deviceId}/telemetry or devices/{deviceId}/events
    const match = topic.match(/^devices\/([^/]+)\//);
    return match ? match[1] : undefined;
  }

  getStats(): BridgeStats {
    return { ...this.stats };
  }

  isEnabled(): boolean {
    return this.enabled && this.pubsub !== null;
  }
}
