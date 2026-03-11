/**
 * Fleet Operations Service
 * Handles batch operations across device fleets
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeviceRepository, DeviceShadowRepository, FleetRepository } from '@fleetforge/database';
import { Device, DeviceStatus, DeviceShadow, IDeviceFilter } from '@fleetforge/core';
import { DeviceLifecycleService, TransitionResult } from '../devices/device-lifecycle.service';

export interface BatchOperationResult<T> {
  success: T[];
  failed: Array<{ deviceId: string; error: string }>;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
}

export interface FleetSummary {
  fleetId: string;
  fleetName: string;
  totalDevices: number;
  byStatus: Record<DeviceStatus, number>;
  onlineCount: number;
  offlineCount: number;
  healthyCount: number;
  unhealthyCount: number;
}

export interface CommandPayload {
  command: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
}

@Injectable()
export class FleetOperationsService {
  private readonly logger = new Logger(FleetOperationsService.name);

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly shadowRepository: DeviceShadowRepository,
    private readonly fleetRepository: FleetRepository,
    private readonly lifecycleService: DeviceLifecycleService,
  ) {}

  /**
   * Get fleet summary with device statistics
   */
  async getFleetSummary(fleetId: string): Promise<FleetSummary> {
    const fleet = await this.fleetRepository.findById(fleetId);
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${fleetId} not found`);
    }

    const devices = await this.deviceRepository.findByFleetId(fleetId);

    const byStatus: Record<string, number> = {};
    let onlineCount = 0;
    let healthyCount = 0;

    for (const device of devices) {
      byStatus[device.status] = (byStatus[device.status] || 0) + 1;
      if (device.isOnline()) onlineCount++;
      if (device.isHealthy()) healthyCount++;
    }

    return {
      fleetId,
      fleetName: fleet.name,
      totalDevices: devices.length,
      byStatus: byStatus as Record<DeviceStatus, number>,
      onlineCount,
      offlineCount: devices.length - onlineCount,
      healthyCount,
      unhealthyCount: devices.length - healthyCount,
    };
  }

  /**
   * Get devices by filter criteria
   */
  async getDevicesByFilter(
    fleetId: string,
    filter: Partial<IDeviceFilter>,
    limit = 100,
    offset = 0,
  ): Promise<Device[]> {
    return this.deviceRepository.findMany({ ...filter, fleetId }, limit, offset);
  }

  /**
   * Batch update desired state for fleet devices
   */
  async batchUpdateDesiredState(
    fleetId: string,
    state: Record<string, unknown>,
    filter?: Partial<IDeviceFilter>,
  ): Promise<{ updated: number; created: number; deviceIds: string[] }> {
    const devices = await this.deviceRepository.findMany(
      { ...filter, fleetId },
      1000, // Max batch size
      0,
    );

    const deviceIds = devices.map((d) => d.id);
    if (deviceIds.length === 0) {
      return { updated: 0, created: 0, deviceIds: [] };
    }

    const result = await this.shadowRepository.batchUpdateDesired(deviceIds, state);

    this.logger.log(
      `Batch update desired state for fleet ${fleetId}: ` +
        `${result.updated} updated, ${result.created} created`,
    );

    return { ...result, deviceIds };
  }

  /**
   * Batch transition devices to a new status
   */
  async batchTransition(
    fleetId: string,
    newStatus: DeviceStatus,
    reason?: string,
    performedBy?: string,
    filter?: Partial<IDeviceFilter>,
  ): Promise<BatchOperationResult<TransitionResult>> {
    const devices = await this.deviceRepository.findMany({ ...filter, fleetId }, 1000, 0);

    const result = await this.lifecycleService.batchTransition(
      devices.map((d) => d.id),
      newStatus,
      reason,
      performedBy,
    );

    return {
      success: result.success,
      failed: result.failed,
      totalProcessed: devices.length,
      successCount: result.success.length,
      failedCount: result.failed.length,
    };
  }

  /**
   * Send command to fleet devices via shadow desired state
   */
  async sendCommand(
    fleetId: string,
    command: CommandPayload,
    filter?: Partial<IDeviceFilter>,
  ): Promise<{ deviceIds: string[]; commandId: string }> {
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const commandState = {
      pendingCommand: {
        id: commandId,
        command: command.command,
        parameters: command.parameters || {},
        timeout: command.timeout || 30000,
        issuedAt: new Date().toISOString(),
      },
    };

    const result = await this.batchUpdateDesiredState(fleetId, commandState, filter);

    this.logger.log(
      `Command ${command.command} sent to ${result.deviceIds.length} devices in fleet ${fleetId}`,
    );

    return { deviceIds: result.deviceIds, commandId };
  }

  /**
   * Batch add tags to devices
   */
  async batchAddTags(
    fleetId: string,
    tags: string[],
    filter?: Partial<IDeviceFilter>,
  ): Promise<BatchOperationResult<{ deviceId: string; tags: string[] }>> {
    const devices = await this.deviceRepository.findMany({ ...filter, fleetId }, 1000, 0);

    const success: Array<{ deviceId: string; tags: string[] }> = [];
    const failed: Array<{ deviceId: string; error: string }> = [];

    for (const device of devices) {
      try {
        const newTags = [...new Set([...device.tags, ...tags])];
        await this.deviceRepository.update(device.id, { tags: newTags });
        success.push({ deviceId: device.id, tags: newTags });
      } catch (error) {
        failed.push({
          deviceId: device.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success,
      failed,
      totalProcessed: devices.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  }

  /**
   * Batch remove tags from devices
   */
  async batchRemoveTags(
    fleetId: string,
    tags: string[],
    filter?: Partial<IDeviceFilter>,
  ): Promise<BatchOperationResult<{ deviceId: string; tags: string[] }>> {
    const devices = await this.deviceRepository.findMany({ ...filter, fleetId }, 1000, 0);

    const success: Array<{ deviceId: string; tags: string[] }> = [];
    const failed: Array<{ deviceId: string; error: string }> = [];
    const tagsToRemove = new Set(tags);

    for (const device of devices) {
      try {
        const newTags = device.tags.filter((t) => !tagsToRemove.has(t));
        await this.deviceRepository.update(device.id, { tags: newTags });
        success.push({ deviceId: device.id, tags: newTags });
      } catch (error) {
        failed.push({
          deviceId: device.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success,
      failed,
      totalProcessed: devices.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  }

  /**
   * Get shadows with pending deltas for a fleet
   */
  async getFleetPendingDeltas(fleetId: string): Promise<DeviceShadow[]> {
    const devices = await this.deviceRepository.findByFleetId(fleetId);
    const deviceIds = devices.map((d) => d.id);
    const shadows = await this.shadowRepository.findByDeviceIds(deviceIds);
    return shadows.filter((s) => s.hasDelta);
  }

  /**
   * Bulk mark shadows as synced
   */
  async bulkMarkSynced(deviceIds: string[]): Promise<BatchOperationResult<{ deviceId: string }>> {
    const success: Array<{ deviceId: string }> = [];
    const failed: Array<{ deviceId: string; error: string }> = [];

    for (const deviceId of deviceIds) {
      try {
        await this.shadowRepository.markSynced(deviceId);
        success.push({ deviceId });
      } catch (error) {
        failed.push({
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success,
      failed,
      totalProcessed: deviceIds.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  }
}
