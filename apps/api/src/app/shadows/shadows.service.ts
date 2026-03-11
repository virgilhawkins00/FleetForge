/**
 * Shadows Service
 * Manages Device Shadow (Digital Twin) operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceShadow } from '@fleetforge/core';
import { DeviceShadowRepository, DeviceRepository } from '@fleetforge/database';
import { ShadowResponseDto, UpdateReportedStateDto, UpdateDesiredStateDto } from './dto';

@Injectable()
export class ShadowsService {
  constructor(
    private readonly shadowRepository: DeviceShadowRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  /**
   * Get shadow for a device
   */
  async getShadow(deviceId: string): Promise<ShadowResponseDto> {
    await this.validateDeviceExists(deviceId);
    const shadow = await this.shadowRepository.getOrCreate(deviceId);
    return this.toResponseDto(shadow);
  }

  /**
   * Update reported state (from device)
   */
  async updateReported(
    deviceId: string,
    dto: UpdateReportedStateDto,
  ): Promise<ShadowResponseDto> {
    await this.validateDeviceExists(deviceId);

    // Ensure shadow exists
    let shadow = await this.shadowRepository.findByDeviceId(deviceId);
    if (!shadow) {
      shadow = DeviceShadow.create(deviceId);
      shadow = await this.shadowRepository.create(shadow);
    }

    shadow.updateReported(dto.state);
    const updated = await this.shadowRepository.save(shadow);
    return this.toResponseDto(updated);
  }

  /**
   * Update desired state (from cloud/application)
   */
  async updateDesired(
    deviceId: string,
    dto: UpdateDesiredStateDto,
  ): Promise<ShadowResponseDto> {
    await this.validateDeviceExists(deviceId);

    let shadow = await this.shadowRepository.findByDeviceId(deviceId);
    if (!shadow) {
      shadow = DeviceShadow.create(deviceId);
      shadow = await this.shadowRepository.create(shadow);
    }

    shadow.updateDesired(dto.state);
    const updated = await this.shadowRepository.save(shadow);
    return this.toResponseDto(updated);
  }

  /**
   * Get delta (difference between desired and reported)
   */
  async getDelta(deviceId: string): Promise<Record<string, unknown>> {
    await this.validateDeviceExists(deviceId);
    const shadow = await this.shadowRepository.findByDeviceId(deviceId);
    if (!shadow) {
      return {};
    }
    return shadow.delta;
  }

  /**
   * Mark shadow as synced (device acknowledged changes)
   */
  async markSynced(deviceId: string): Promise<ShadowResponseDto> {
    await this.validateDeviceExists(deviceId);
    const shadow = await this.shadowRepository.markSynced(deviceId);
    if (!shadow) {
      throw new NotFoundException(`Shadow for device ${deviceId} not found`);
    }
    return this.toResponseDto(shadow);
  }

  /**
   * Delete shadow for a device
   */
  async deleteShadow(deviceId: string): Promise<void> {
    await this.shadowRepository.delete(deviceId);
  }

  /**
   * Get all shadows with pending deltas
   */
  async getShadowsWithPendingDeltas(limit = 100): Promise<ShadowResponseDto[]> {
    const shadows = await this.shadowRepository.findWithPendingDeltas(limit);
    return shadows.map((s) => this.toResponseDto(s));
  }

  private async validateDeviceExists(deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
  }

  private toResponseDto(shadow: DeviceShadow): ShadowResponseDto {
    const json = shadow.toJSON() as Record<string, unknown>;
    return {
      id: json['id'] as string,
      deviceId: json['deviceId'] as string,
      state: json['state'] as ShadowResponseDto['state'],
      metadata: json['metadata'] as ShadowResponseDto['metadata'],
      version: json['version'] as number,
      hasDelta: json['hasDelta'] as boolean,
      lastReportedAt: json['lastReportedAt'] as Date | undefined,
      lastDesiredAt: json['lastDesiredAt'] as Date | undefined,
      lastSyncedAt: json['lastSyncedAt'] as Date | undefined,
      createdAt: json['createdAt'] as Date,
      updatedAt: json['updatedAt'] as Date,
    };
  }
}

