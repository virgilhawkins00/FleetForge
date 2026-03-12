import { TelemetryData, DeviceConfig } from './types';

export class TelemetryGenerator {
  private baseValues: Record<string, { cpu: number; memory: number; temperature: number }> = {};

  generateTelemetry(device: DeviceConfig): TelemetryData {
    // Initialize base values for consistent simulation
    if (!this.baseValues[device.id]) {
      this.baseValues[device.id] = {
        cpu: 20 + Math.random() * 30,
        memory: 40 + Math.random() * 20,
        temperature: 35 + Math.random() * 10,
      };
    }

    const base = this.baseValues[device.id];
    
    // Add realistic variations
    const telemetry: TelemetryData = {
      deviceId: device.id,
      timestamp: new Date(),
      metrics: {
        cpu: this.vary(base.cpu, 5, 0, 100),
        memory: this.vary(base.memory, 3, 0, 100),
        temperature: this.vary(base.temperature, 2, 20, 80),
      },
    };

    // Add type-specific metrics
    if (device.type === 'sensor' || device.type === 'edge') {
      telemetry.metrics.battery = this.vary(85, 5, 0, 100);
      telemetry.metrics.signalStrength = this.vary(-60, 10, -100, -30);
    }

    // Add location for some devices
    if (device.type === 'gateway' || device.type === 'edge') {
      telemetry.location = {
        latitude: this.vary(-23.5505, 0.001, -90, 90),
        longitude: this.vary(-46.6333, 0.001, -180, 180),
      };
    }

    // Add custom metrics based on capabilities
    if (device.capabilities.includes('humidity')) {
      telemetry.custom = { ...telemetry.custom, humidity: this.vary(65, 5, 20, 95) };
    }
    if (device.capabilities.includes('pressure')) {
      telemetry.custom = { ...telemetry.custom, pressure: this.vary(1013, 5, 950, 1050) };
    }
    if (device.capabilities.includes('light')) {
      telemetry.custom = { ...telemetry.custom, lightLevel: this.vary(500, 100, 0, 10000) };
    }

    // Update base values with drift
    base.cpu = this.vary(base.cpu, 1, 15, 85);
    base.memory = this.vary(base.memory, 0.5, 30, 90);
    base.temperature = this.vary(base.temperature, 0.2, 30, 70);

    return telemetry;
  }

  generateAnomaly(device: DeviceConfig): TelemetryData {
    const telemetry = this.generateTelemetry(device);
    
    // Create anomalous values
    const anomalyType = Math.floor(Math.random() * 3);
    switch (anomalyType) {
      case 0: // High CPU
        telemetry.metrics.cpu = 95 + Math.random() * 5;
        break;
      case 1: // High temperature
        telemetry.metrics.temperature = 75 + Math.random() * 10;
        break;
      case 2: // Memory spike
        telemetry.metrics.memory = 90 + Math.random() * 10;
        break;
    }

    return telemetry;
  }

  private vary(value: number, variance: number, min: number, max: number): number {
    const newValue = value + (Math.random() - 0.5) * variance * 2;
    return Math.max(min, Math.min(max, Number(newValue.toFixed(2))));
  }
}

