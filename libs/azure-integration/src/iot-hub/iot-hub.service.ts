/**
 * Azure IoT Hub Service for FleetForge
 *
 * Provides device management, twin operations, and cloud-to-device messaging
 */

import { Registry, Client as ServiceClient } from 'azure-iothub';
import { IoTHubConfig, DeviceTwin, CloudToDeviceMessage } from '../types';

export class IoTHubService {
  private registry: Registry;
  private serviceClient: ServiceClient;
  private initialized = false;

  constructor(config: IoTHubConfig) {
    this.registry = Registry.fromConnectionString(config.iotHubConnectionString);
    this.serviceClient = ServiceClient.fromConnectionString(config.iotHubConnectionString);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.serviceClient.open();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (!this.initialized) return;
    await this.serviceClient.close();
    this.initialized = false;
  }

  // ==================== Device Registry Operations ====================

  /**
   * Create a new device in IoT Hub
   */
  async createDevice(deviceId: string, options?: { enabled?: boolean }): Promise<DeviceTwin> {
    const deviceInfo = {
      deviceId,
      status: options?.enabled !== false ? 'enabled' : 'disabled',
    };

    const result = await this.registry.create(deviceInfo);
    return this.mapToDeviceTwin(result.responseBody);
  }

  /**
   * Get device information
   */
  async getDevice(deviceId: string): Promise<DeviceTwin | null> {
    try {
      const result = await this.registry.get(deviceId);
      return this.mapToDeviceTwin(result.responseBody);
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * List all devices (with pagination)
   */
  async listDevices(maxCount = 1000): Promise<DeviceTwin[]> {
    const result = await this.registry.list();
    return result.responseBody.slice(0, maxCount).map((d) => this.mapToDeviceTwin(d));
  }

  /**
   * Delete a device from IoT Hub
   */
  async deleteDevice(deviceId: string): Promise<void> {
    await this.registry.delete(deviceId);
  }

  /**
   * Enable or disable a device
   */
  async setDeviceStatus(deviceId: string, enabled: boolean): Promise<DeviceTwin> {
    const device = await this.registry.get(deviceId);
    device.responseBody.status = enabled ? 'enabled' : 'disabled';
    const result = await this.registry.update(device.responseBody);
    return this.mapToDeviceTwin(result.responseBody);
  }

  // ==================== Device Twin Operations ====================

  /**
   * Get device twin
   */
  async getTwin(deviceId: string): Promise<DeviceTwin> {
    const result = await this.registry.getTwin(deviceId);
    return {
      deviceId: result.responseBody.deviceId,
      etag: result.responseBody.etag,
      tags: result.responseBody.tags,
      properties: {
        desired: result.responseBody.properties?.desired,
        reported: result.responseBody.properties?.reported,
      },
    };
  }

  /**
   * Update device twin tags and desired properties
   */
  async updateTwin(
    deviceId: string,
    patch: { tags?: Record<string, unknown>; properties?: { desired?: Record<string, unknown> } },
  ): Promise<DeviceTwin> {
    const twin = await this.registry.getTwin(deviceId);
    const result = await this.registry.updateTwin(deviceId, patch, twin.responseBody.etag || '*');
    return {
      deviceId: result.responseBody.deviceId,
      etag: result.responseBody.etag,
      tags: result.responseBody.tags,
      properties: {
        desired: result.responseBody.properties?.desired,
        reported: result.responseBody.properties?.reported,
      },
    };
  }

  // ==================== Cloud-to-Device Messaging ====================

  /**
   * Send a cloud-to-device message
   */
  async sendC2DMessage(message: CloudToDeviceMessage): Promise<void> {
    const { Message } = await import('azure-iot-common');
    const msg = new Message(message.data);

    if (message.messageId) msg.messageId = message.messageId;
    if (message.correlationId) msg.correlationId = message.correlationId;
    if (message.expiryTimeUtc) msg.expiryTimeUtc = message.expiryTimeUtc;
    if (message.ack) msg.ack = message.ack;

    if (message.properties) {
      for (const [key, value] of Object.entries(message.properties)) {
        msg.properties.add(key, value);
      }
    }

    await this.serviceClient.send(message.deviceId, msg);
  }

  /**
   * Send a command to device
   */
  async sendCommand(deviceId: string, command: string, payload?: unknown): Promise<void> {
    const data = JSON.stringify({ command, payload, timestamp: new Date().toISOString() });
    await this.sendC2DMessage({ deviceId, data });
  }

  private mapToDeviceTwin(device: unknown): DeviceTwin {
    const d = device as Record<string, unknown>;
    return {
      deviceId: d['deviceId'] as string,
      etag: d['etag'] as string | undefined,
      status: d['status'] as 'enabled' | 'disabled' | undefined,
    };
  }
}
