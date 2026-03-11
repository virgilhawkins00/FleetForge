/**
 * Device Shadow Repository
 * Handles persistence of device shadow (digital twin) state
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceShadow } from '@fleetforge/core';
import { DeviceShadowModel, DeviceShadowDocument } from '../schemas/device-shadow.schema';
import { DeviceShadowMapper } from '../mappers/device-shadow.mapper';

@Injectable()
export class DeviceShadowRepository {
  constructor(
    @InjectModel(DeviceShadowModel.name)
    private readonly shadowModel: Model<DeviceShadowDocument>,
  ) {}

  /**
   * Find shadow by device ID
   */
  async findByDeviceId(deviceId: string): Promise<DeviceShadow | null> {
    const doc = await this.shadowModel.findOne({ deviceId }).exec();
    return doc ? DeviceShadowMapper.toDomain(doc) : null;
  }

  /**
   * Create a new shadow document
   */
  async create(shadow: DeviceShadow): Promise<DeviceShadow> {
    const data = DeviceShadowMapper.toPersistence(shadow);
    const doc = new this.shadowModel(data);
    const saved = await doc.save();
    return DeviceShadowMapper.toDomain(saved);
  }

  /**
   * Update reported state (from device)
   */
  async updateReported(
    deviceId: string,
    state: Record<string, unknown>,
  ): Promise<DeviceShadow | null> {
    const shadow = await this.findByDeviceId(deviceId);
    if (!shadow) return null;

    shadow.updateReported(state);
    return this.save(shadow);
  }

  /**
   * Update desired state (from cloud/application)
   */
  async updateDesired(
    deviceId: string,
    state: Record<string, unknown>,
  ): Promise<DeviceShadow | null> {
    const shadow = await this.findByDeviceId(deviceId);
    if (!shadow) return null;

    shadow.updateDesired(state);
    return this.save(shadow);
  }

  /**
   * Save updated shadow with optimistic locking
   */
  async save(shadow: DeviceShadow): Promise<DeviceShadow> {
    const data = DeviceShadowMapper.toPersistence(shadow);
    const doc = await this.shadowModel
      .findOneAndUpdate(
        { _id: shadow.id, version: shadow.version - 1 }, // Optimistic lock
        { $set: data },
        { new: true, upsert: true },
      )
      .exec();

    if (!doc) {
      // Version conflict - refetch and retry or throw
      throw new Error(`Shadow version conflict for device ${shadow.deviceId}`);
    }

    return DeviceShadowMapper.toDomain(doc);
  }

  /**
   * Find all shadows with pending deltas
   */
  async findWithPendingDeltas(limit = 100): Promise<DeviceShadow[]> {
    const docs = await this.shadowModel
      .find({ hasDelta: true })
      .limit(limit)
      .sort({ updatedAt: -1 })
      .exec();
    return docs.map(DeviceShadowMapper.toDomain);
  }

  /**
   * Mark shadow as synced
   */
  async markSynced(deviceId: string): Promise<DeviceShadow | null> {
    const doc = await this.shadowModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: {
            delta: {},
            hasDelta: false,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .exec();

    return doc ? DeviceShadowMapper.toDomain(doc) : null;
  }

  /**
   * Delete shadow for a device
   */
  async delete(deviceId: string): Promise<void> {
    await this.shadowModel.findOneAndDelete({ deviceId }).exec();
  }

  /**
   * Get or create shadow for a device
   */
  async getOrCreate(
    deviceId: string,
    initialState: Record<string, unknown> = {},
  ): Promise<DeviceShadow> {
    let shadow = await this.findByDeviceId(deviceId);
    if (!shadow) {
      shadow = DeviceShadow.create(deviceId, initialState);
      shadow = await this.create(shadow);
    }
    return shadow;
  }

  /**
   * Find shadows by multiple device IDs
   */
  async findByDeviceIds(deviceIds: string[]): Promise<DeviceShadow[]> {
    const docs = await this.shadowModel.find({ deviceId: { $in: deviceIds } }).exec();
    return docs.map(DeviceShadowMapper.toDomain);
  }

  /**
   * Batch update desired state for multiple devices
   */
  async batchUpdateDesired(
    deviceIds: string[],
    state: Record<string, unknown>,
  ): Promise<{ updated: number; created: number }> {
    // First, update existing shadows
    const updateResult = await this.shadowModel
      .updateMany(
        { deviceId: { $in: deviceIds } },
        {
          $set: {
            'state.desired': state,
            hasDelta: true,
            lastDesiredAt: new Date(),
            updatedAt: new Date(),
          },
          $inc: { version: 1 },
        },
      )
      .exec();

    // Find which device IDs don't have shadows yet
    const existingShadows = await this.shadowModel
      .find({ deviceId: { $in: deviceIds } })
      .select('deviceId')
      .exec();
    const existingIds = new Set(existingShadows.map((s) => s.deviceId));
    const missingIds = deviceIds.filter((id) => !existingIds.has(id));

    // Create shadows for missing devices
    if (missingIds.length > 0) {
      const newShadows = missingIds.map((deviceId) => ({
        _id: `shadow-${deviceId}`,
        deviceId,
        state: { reported: {}, desired: state, delta: state },
        hasDelta: true,
        version: 1,
        lastDesiredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await this.shadowModel.insertMany(newShadows);
    }

    return {
      updated: updateResult.modifiedCount,
      created: missingIds.length,
    };
  }

  /**
   * Count shadows by fleet (requires join with devices)
   */
  async countByDeviceIds(deviceIds: string[]): Promise<number> {
    return this.shadowModel.countDocuments({ deviceId: { $in: deviceIds } }).exec();
  }
}
