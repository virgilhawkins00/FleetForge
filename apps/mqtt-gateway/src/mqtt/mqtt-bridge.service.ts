import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Local interfaces - GCP integration is optional
export interface TelemetryMessage {
  deviceId: string;
  timestamp: Date;
  metrics: Record<string, unknown>;
  fleetId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceEvent {
  deviceId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface BridgeStats {
  telemetryCount: number;
  eventCount: number;
  errorCount: number;
  lastActivity: Date | null;
}

// GCP PubSub interface for optional dependency injection
interface PubSubInterface {
  initialize(): Promise<void>;
  publishTelemetry(message: TelemetryMessage): Promise<unknown>;
  publishEvent(event: DeviceEvent): Promise<unknown>;
}

@Injectable()
export class MqttBridgeService implements OnModuleInit {
  private readonly logger = new Logger(MqttBridgeService.name);
  private readonly enabled: boolean;
  private pubsub: PubSubInterface | null = null;

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
      this.logger.warn('GCP bridge is disabled. Running in standalone mode.');
      this.logger.log('📡 MQTT Gateway ready (local mode - no GCP bridge)');
      return;
    }

    try {
      // Dynamic import for GCP integration (optional dependency)
      const { PubSubService } = await import('@fleetforge/gcp-integration');
      const projectId = this.configService.get<string>('GCP_PROJECT_ID', 'fleetforge-prod');
      const credentials = this.configService.get<string>('GCP_CREDENTIALS');

      const pubsubInstance = new PubSubService({
        projectId,
        credentials,
        telemetryTopic: this.configService.get<string>(
          'GCP_TELEMETRY_TOPIC',
          'fleetforge-telemetry',
        ),
        commandsTopic: this.configService.get<string>('GCP_COMMANDS_TOPIC', 'fleetforge-commands'),
        eventsTopic: this.configService.get<string>('GCP_EVENTS_TOPIC', 'fleetforge-events'),
      });

      await pubsubInstance.initialize();
      this.pubsub = pubsubInstance;
      this.logger.log('✅ GCP Pub/Sub bridge initialized');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initialize GCP bridge: ${err.message}`);
      this.logger.warn('Running in standalone mode without GCP bridge');
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
