/**
 * Digital Twin Service Interface (Port)
 * Manages device state synchronization
 */

import { Device } from '../../entities';

export interface IDeviceState {
  reported: Record<string, unknown>;
  desired: Record<string, unknown>;
  delta: Record<string, unknown>;
  lastUpdated: Date;
}

export interface IDigitalTwinService {
  /**
   * Get device digital twin state
   */
  getDeviceState(deviceId: string): Promise<IDeviceState>;

  /**
   * Update desired state
   */
  updateDesiredState(deviceId: string, state: Record<string, unknown>): Promise<void>;

  /**
   * Update reported state (from device)
   */
  updateReportedState(deviceId: string, state: Record<string, unknown>): Promise<void>;

  /**
   * Calculate state delta
   */
  calculateDelta(deviceId: string): Promise<Record<string, unknown>>;

  /**
   * Sync device with desired state
   */
  syncDevice(deviceId: string): Promise<void>;

  /**
   * Get devices with state mismatch
   */
  getDevicesWithMismatch(): Promise<Device[]>;
}

