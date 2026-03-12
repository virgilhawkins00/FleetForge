import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { v4 as uuidv4 } from 'uuid';
import { DeviceConfig, DeviceState, TelemetryData, SimulatorConfig } from './types';
import { TelemetryGenerator } from './telemetry-generator';

export class SimulatedDevice {
  private config: DeviceConfig;
  private state: DeviceState;
  private api: AxiosInstance;
  private socket: Socket | null = null;
  private mqttClient: MqttClient | null = null;
  private telemetryGenerator: TelemetryGenerator;
  private telemetryInterval: NodeJS.Timeout | null = null;
  private simulatorConfig: SimulatorConfig;
  private onTelemetry?: (data: TelemetryData) => void;
  private onError?: (error: Error) => void;

  constructor(
    simulatorConfig: SimulatorConfig,
    deviceIndex: number,
    callbacks?: { onTelemetry?: (data: TelemetryData) => void; onError?: (error: Error) => void },
  ) {
    this.simulatorConfig = simulatorConfig;
    this.telemetryGenerator = new TelemetryGenerator();
    this.onTelemetry = callbacks?.onTelemetry;
    this.onError = callbacks?.onError;

    this.config = {
      id: uuidv4(),
      name: `sim-${simulatorConfig.deviceType}-${deviceIndex.toString().padStart(3, '0')}`,
      type: simulatorConfig.deviceType,
      firmwareVersion: 'v2.4.1-sim',
      capabilities: this.getCapabilitiesForType(simulatorConfig.deviceType),
    };

    this.state = {
      config: this.config,
      status: 'offline',
      connected: false,
      errors: 0,
    };

    this.api = axios.create({
      baseURL: `${simulatorConfig.apiUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        ...(simulatorConfig.token && { Authorization: `Bearer ${simulatorConfig.token}` }),
      },
    });
  }

  private getCapabilitiesForType(type: DeviceConfig['type']): string[] {
    const capabilities: Record<DeviceConfig['type'], string[]> = {
      gateway: ['telemetry', 'ota', 'config', 'commands'],
      sensor: ['telemetry', 'humidity', 'pressure', 'light'],
      edge: ['telemetry', 'ota', 'compute', 'ml-inference'],
      actuator: ['telemetry', 'commands', 'state-control'],
    };
    return capabilities[type];
  }

  async register(): Promise<void> {
    try {
      const response = await this.api.post('/devices', {
        name: this.config.name,
        type: this.config.type,
        firmwareVersion: this.config.firmwareVersion,
        capabilities: this.config.capabilities,
        fleetId: this.simulatorConfig.fleetId,
      });
      this.config.id = response.data.id;
      this.state.status = 'online';
    } catch (error) {
      this.state.errors++;
      this.onError?.(error as Error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (this.simulatorConfig.protocol === 'mqtt') {
      return this.connectMqtt();
    }
    return this.connectWebSocket();
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.simulatorConfig.wsUrl, {
        auth: { token: this.simulatorConfig.token, deviceId: this.config.id },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        this.state.connected = true;
        this.state.status = 'online';
        this.socket?.emit('device:register', { deviceId: this.config.id });
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.state.connected = false;
        this.state.status = 'offline';
      });

      this.socket.on('command', (data) => this.handleCommand(data));
      this.socket.on('ota:start', (data) => this.handleOtaUpdate(data));
      this.socket.on('error', (error) => {
        this.state.errors++;
        this.onError?.(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  private async connectMqtt(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mqttUrl = this.simulatorConfig.mqttUrl || 'mqtt://localhost:1883';

      this.mqttClient = mqtt.connect(mqttUrl, {
        clientId: this.config.id,
        username: this.config.id,
        password: this.simulatorConfig.token || 'fleetforge',
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
      });

      this.mqttClient.on('connect', () => {
        this.state.connected = true;
        this.state.status = 'online';

        // Subscribe to device-specific topics
        const topics = [
          `devices/${this.config.id}/commands`,
          `devices/${this.config.id}/ota`,
          `devices/${this.config.id}/config`,
        ];
        this.mqttClient?.subscribe(topics, (err) => {
          if (err) {
            this.onError?.(err);
          }
        });

        resolve();
      });

      this.mqttClient.on('close', () => {
        this.state.connected = false;
        this.state.status = 'offline';
      });

      this.mqttClient.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          if (topic.includes('/commands')) {
            this.handleCommand(payload);
          } else if (topic.includes('/ota')) {
            this.handleOtaUpdate(payload);
          }
        } catch {
          this.state.errors++;
        }
      });

      this.mqttClient.on('error', (error) => {
        this.state.errors++;
        this.onError?.(error);
        reject(error);
      });

      setTimeout(() => reject(new Error('MQTT connection timeout')), 10000);
    });
  }

  startTelemetry(): void {
    if (this.telemetryInterval) return;
    this.telemetryInterval = setInterval(
      () => this.sendTelemetry(),
      this.simulatorConfig.telemetryIntervalMs,
    );
    this.sendTelemetry(); // Send immediately
  }

  private async sendTelemetry(): Promise<void> {
    const shouldAnomaly = Math.random() < 0.02; // 2% chance of anomaly
    const telemetry = shouldAnomaly
      ? this.telemetryGenerator.generateAnomaly(this.config)
      : this.telemetryGenerator.generateTelemetry(this.config);

    this.state.lastTelemetry = telemetry;
    this.onTelemetry?.(telemetry);

    // MQTT transport
    if (this.mqttClient?.connected) {
      const topic = `devices/${this.config.id}/telemetry`;
      this.mqttClient.publish(topic, JSON.stringify(telemetry), { qos: 1 });
      return;
    }

    // WebSocket transport
    if (this.socket?.connected) {
      this.socket.emit('telemetry', telemetry);
      return;
    }

    // HTTP fallback
    try {
      await this.api.post('/telemetry', telemetry);
    } catch {
      this.state.errors++;
    }
  }

  private handleCommand(data: { command: string; payload?: unknown }): void {
    if (this.simulatorConfig.verbose) console.log(`[${this.config.name}] Command: ${data.command}`);

    const ack = { deviceId: this.config.id, command: data.command, status: 'executed' };

    if (this.mqttClient?.connected) {
      this.mqttClient.publish(`devices/${this.config.id}/commands/ack`, JSON.stringify(ack));
    } else {
      this.socket?.emit('command:ack', ack);
    }
  }

  private handleOtaUpdate(data: { firmwareId: string; version: string }): void {
    if (this.simulatorConfig.verbose) console.log(`[${this.config.name}] OTA: ${data.version}`);
    setTimeout(
      () => {
        this.config.firmwareVersion = data.version;
        const result = { deviceId: this.config.id, version: data.version, success: true };

        if (this.mqttClient?.connected) {
          this.mqttClient.publish(`devices/${this.config.id}/ota/complete`, JSON.stringify(result));
        } else {
          this.socket?.emit('ota:complete', result);
        }
      },
      5000 + Math.random() * 10000,
    );
  }

  async stop(): Promise<void> {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
    this.socket?.disconnect();
    this.mqttClient?.end();
    this.state.status = 'offline';
    this.state.connected = false;
  }

  getState(): DeviceState {
    return this.state;
  }
  getConfig(): DeviceConfig {
    return this.config;
  }
}
