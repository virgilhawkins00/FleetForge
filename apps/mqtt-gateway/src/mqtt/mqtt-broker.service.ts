import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Aedes,
  AedesPublishPacket,
  Client,
  Subscription,
  AuthenticateError,
  PublishPacket,
} from 'aedes';
import { createServer, Server } from 'net';
import { MqttBridgeService } from './mqtt-bridge.service';

export interface ConnectedClient {
  clientId: string;
  deviceId?: string;
  connectedAt: Date;
  subscriptions: string[];
}

@Injectable()
export class MqttBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBrokerService.name);
  private broker!: Aedes;
  private server!: Server;
  private connectedClients = new Map<string, ConnectedClient>();

  constructor(
    private readonly configService: ConfigService,
    private readonly bridgeService: MqttBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  async start(): Promise<void> {
    const port = this.configService.get<number>('MQTT_PORT', 1883);

    // Aedes 1.x uses createBroker static factory
    this.broker = await Aedes.createBroker({
      id: 'fleetforge-mqtt-gateway',
      heartbeatInterval: 60000,
      connectTimeout: 30000,
    });

    this.setupEventHandlers();

    this.server = createServer(this.broker.handle);

    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        this.logger.log(`🚀 MQTT Broker started on port ${port}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  private setupEventHandlers(): void {
    // Client authentication
    this.broker.authenticate = (
      client: Client,
      username: Readonly<string | undefined>,
      password: Readonly<Buffer | undefined>,
      callback: (error: AuthenticateError | null, success: boolean | null) => void,
    ) => {
      const passwordStr = password?.toString();
      // TODO: Implement proper auth with JWT or API key
      const isValid = username && passwordStr;

      if (isValid) {
        this.logger.debug(`Client ${client.id} authenticated as ${username}`);
        callback(null, true);
      } else {
        this.logger.warn(`Client ${client.id} authentication failed`);
        const error = new Error('Authentication failed') as AuthenticateError;
        error.returnCode = 4; // CONNACK return code for bad credentials
        callback(error, false);
      }
    };

    // Client connected
    this.broker.on('client', (client: Client) => {
      const deviceId = this.extractDeviceId(client.id);
      this.connectedClients.set(client.id, {
        clientId: client.id,
        deviceId,
        connectedAt: new Date(),
        subscriptions: [],
      });

      this.logger.log(`Client connected: ${client.id} (device: ${deviceId || 'unknown'})`);
      this.bridgeService.publishEvent('connect', deviceId || client.id);
    });

    // Client disconnected
    this.broker.on('clientDisconnect', (client: Client) => {
      const info = this.connectedClients.get(client.id);
      this.connectedClients.delete(client.id);

      this.logger.log(`Client disconnected: ${client.id}`);
      this.bridgeService.publishEvent('disconnect', info?.deviceId || client.id);
    });

    // Message published
    this.broker.on('publish', async (packet: AedesPublishPacket, client: Client | null) => {
      if (!client) return; // Skip internal messages

      const topic = packet.topic;
      const payload = packet.payload.toString();

      this.logger.debug(`Message from ${client.id} on ${topic}`);

      // Bridge to GCP based on topic
      if (topic.startsWith('devices/') && topic.includes('/telemetry')) {
        await this.bridgeService.bridgeTelemetry(topic, payload, client.id);
      } else if (topic.startsWith('devices/') && topic.includes('/events')) {
        await this.bridgeService.bridgeEvent(topic, payload, client.id);
      }
    });

    // Subscription
    this.broker.on('subscribe', (subscriptions: Subscription[], client: Client) => {
      const info = this.connectedClients.get(client.id);
      if (info) {
        info.subscriptions.push(...subscriptions.map((s) => s.topic));
      }
      this.logger.debug(
        `Client ${client.id} subscribed to: ${subscriptions.map((s) => s.topic).join(', ')}`,
      );
    });
  }

  private extractDeviceId(clientId: string): string | undefined {
    // Extract device ID from client ID pattern: "device-{deviceId}" or just deviceId
    const match = clientId.match(/^device[-_]?(.+)$/i);
    return match ? match[1] : clientId;
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.broker.close(() => {
          this.logger.log('MQTT Broker stopped');
          resolve();
        });
      });
    });
  }

  // Public methods for external use
  publishToDevice(deviceId: string, topic: string, payload: string): void {
    const packet: PublishPacket = {
      topic: `devices/${deviceId}/${topic}`,
      payload: Buffer.from(payload),
      qos: 1,
      retain: false,
      cmd: 'publish',
      dup: false,
    };

    this.broker.publish(packet, (err?: Error) => {
      if (err) this.logger.error(`Failed to publish to ${deviceId}: ${err.message}`);
    });
  }

  getConnectedClients(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  getClientCount(): number {
    return this.connectedClients.size;
  }
}
