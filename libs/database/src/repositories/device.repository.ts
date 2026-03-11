/**
 * Device MongoDB Repository
 * Implements IDeviceRepository from @fleetforge/core
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Device, IDeviceRepository, IDeviceFilter, DeviceStatus } from '@fleetforge/core';
import { DeviceModel, DeviceDocument } from '../schemas';
import { DeviceMapper } from '../mappers';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
  constructor(
    @InjectModel(DeviceModel.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async findById(id: string): Promise<Device | null> {
    const doc = await this.deviceModel.findById(id).exec();
    return doc ? DeviceMapper.toDomain(doc) : null;
  }

  async findMany(filter: IDeviceFilter, limit = 100, offset = 0): Promise<Device[]> {
    const query = this.buildQuery(filter);
    const docs = await this.deviceModel
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ lastSeen: -1 })
      .exec();
    return docs.map(DeviceMapper.toDomain);
  }

  async findByFleetId(fleetId: string): Promise<Device[]> {
    const docs = await this.deviceModel.find({ fleetId }).sort({ name: 1 }).exec();
    return docs.map(DeviceMapper.toDomain);
  }

  async create(device: Device): Promise<Device> {
    const data = DeviceMapper.toPersistence(device);
    const doc = new this.deviceModel(data);
    const saved = await doc.save();
    return DeviceMapper.toDomain(saved);
  }

  async update(id: string, device: Partial<Device>): Promise<Device> {
    const updateData: Record<string, unknown> = {};

    if (device.name !== undefined) updateData['name'] = device.name;
    if (device.status !== undefined) updateData['status'] = device.status;
    if (device.firmwareVersion !== undefined)
      updateData['firmwareVersion'] = device.firmwareVersion;
    if (device.lastSeen !== undefined) updateData['lastSeen'] = device.lastSeen;
    if (device.location !== undefined) updateData['location'] = device.location;
    if (device.health !== undefined) updateData['health'] = device.health;
    if (device.tags !== undefined) updateData['tags'] = device.tags;
    updateData['updatedAt'] = new Date();

    const doc = await this.deviceModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!doc) {
      throw new Error(`Device not found: ${id}`);
    }
    return DeviceMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.deviceModel.findByIdAndDelete(id).exec();
  }

  async count(filter: IDeviceFilter): Promise<number> {
    const query = this.buildQuery(filter);
    return this.deviceModel.countDocuments(query).exec();
  }

  async findDevicesNeedingUpdate(firmwareVersion: string): Promise<Device[]> {
    const docs = await this.deviceModel
      .find({
        firmwareVersion: { $ne: firmwareVersion },
        status: DeviceStatus.ACTIVE,
      })
      .exec();
    return docs.map(DeviceMapper.toDomain);
  }

  async findByTags(tags: string[]): Promise<Device[]> {
    const docs = await this.deviceModel.find({ tags: { $all: tags } }).exec();
    return docs.map(DeviceMapper.toDomain);
  }

  async bulkUpdateStatus(deviceIds: string[], status: DeviceStatus): Promise<number> {
    const result = await this.deviceModel
      .updateMany({ _id: { $in: deviceIds } }, { $set: { status, updatedAt: new Date() } })
      .exec();
    return result.modifiedCount;
  }

  private buildQuery(filter: IDeviceFilter): FilterQuery<DeviceDocument> {
    const query: FilterQuery<DeviceDocument> = {};

    if (filter.fleetId) {
      query.fleetId = filter.fleetId;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.tags && filter.tags.length > 0) {
      query.tags = { $all: filter.tags };
    }
    if (filter.firmwareVersion) {
      query.firmwareVersion = filter.firmwareVersion;
    }
    if (filter.online !== undefined) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (filter.online) {
        query.lastSeen = { $gte: fiveMinutesAgo };
        query.status = DeviceStatus.ACTIVE;
      } else {
        query.$or = [
          { lastSeen: { $lt: fiveMinutesAgo } },
          { status: { $ne: DeviceStatus.ACTIVE } },
        ];
      }
    }

    return query;
  }
}
