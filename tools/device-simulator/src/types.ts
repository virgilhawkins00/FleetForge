export interface DeviceConfig {
  id: string;
  name: string;
  type: 'gateway' | 'sensor' | 'edge' | 'actuator';
  firmwareVersion: string;
  capabilities: string[];
}

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  metrics: {
    cpu: number;
    memory: number;
    temperature: number;
    battery?: number;
    signalStrength?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  custom?: Record<string, unknown>;
}

export interface SimulatorConfig {
  apiUrl: string;
  wsUrl: string;
  mqttUrl?: string; // MQTT broker URL (e.g., mqtt://localhost:1883)
  protocol: 'websocket' | 'mqtt'; // Transport protocol
  token?: string;
  deviceCount: number;
  telemetryIntervalMs: number;
  deviceType: DeviceConfig['type'];
  fleetId?: string;
  verbose: boolean;
}

export interface DeviceState {
  config: DeviceConfig;
  status: 'online' | 'offline' | 'maintenance';
  lastTelemetry?: TelemetryData;
  connected: boolean;
  errors: number;
}

export interface SimulatorStats {
  devicesCreated: number;
  telemetrySent: number;
  errors: number;
  uptime: number;
  startTime: Date;
}
