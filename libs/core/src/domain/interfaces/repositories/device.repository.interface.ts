/**
 * Device Repository Interface (Port)
 * Defines contract for device data access
 */

import { Device } from '../../entities';
import { DeviceStatus } from '../../enums';

export interface IDeviceFilter {
  fleetId?: string;
  status?: DeviceStatus;
  tags?: string[];
  firmwareVersion?: string;
  online?: boolean;
}

export interface IDeviceRepository {
  /**
   * Find device by ID
   */
  findById(id: string): Promise<Device | null>;

  /**
   * Find devices by filter
   */
  findMany(filter: IDeviceFilter, limit?: number, offset?: number): Promise<Device[]>;

  /**
   * Find all devices in a fleet
   */
  findByFleetId(fleetId: string): Promise<Device[]>;

  /**
   * Create new device
   */
  create(device: Device): Promise<Device>;

  /**
   * Update existing device
   */
  update(id: string, device: Partial<Device>): Promise<Device>;

  /**
   * Delete device
   */
  delete(id: string): Promise<void>;

  /**
   * Count devices by filter
   */
  count(filter: IDeviceFilter): Promise<number>;

  /**
   * Find devices that need firmware update
   */
  findDevicesNeedingUpdate(firmwareVersion: string): Promise<Device[]>;

  /**
   * Bulk update device status
   */
  bulkUpdateStatus(deviceIds: string[], status: DeviceStatus): Promise<number>;
}

