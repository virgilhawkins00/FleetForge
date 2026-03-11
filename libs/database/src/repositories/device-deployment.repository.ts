/**
 * DeviceDeployment MongoDB Repository
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { DeviceDeployment, DeviceDeploymentStatus } from '@fleetforge/core';
import { DeviceDeploymentModel, DeviceDeploymentDocument } from '../schemas';
import { DeviceDeploymentMapper } from '../mappers';

export interface IDeviceDeploymentFilter {
  deploymentId?: string;
  deviceId?: string;
  firmwareId?: string;
  status?: DeviceDeploymentStatus | DeviceDeploymentStatus[];
}

export interface IDeviceDeploymentStats {
  total: number;
  pending: number;
  downloading: number;
  downloaded: number;
  installing: number;
  rebooting: number;
  succeeded: number;
  failed: number;
  rolledBack: number;
  skipped: number;
}

@Injectable()
export class DeviceDeploymentRepository {
  constructor(
    @InjectModel(DeviceDeploymentModel.name)
    private readonly model: Model<DeviceDeploymentDocument>,
  ) {}

  async findById(id: string): Promise<DeviceDeployment | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? DeviceDeploymentMapper.toDomain(doc) : null;
  }

  async findByDeploymentAndDevice(
    deploymentId: string,
    deviceId: string,
  ): Promise<DeviceDeployment | null> {
    const doc = await this.model.findOne({ deploymentId, deviceId }).exec();
    return doc ? DeviceDeploymentMapper.toDomain(doc) : null;
  }

  async findMany(
    filter: IDeviceDeploymentFilter,
    limit = 100,
    offset = 0,
  ): Promise<DeviceDeployment[]> {
    const query = this.buildQuery(filter);
    const docs = await this.model
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(DeviceDeploymentMapper.toDomain);
  }

  async findByDeployment(deploymentId: string): Promise<DeviceDeployment[]> {
    const docs = await this.model.find({ deploymentId }).exec();
    return docs.map(DeviceDeploymentMapper.toDomain);
  }

  async create(entity: DeviceDeployment): Promise<DeviceDeployment> {
    const data = DeviceDeploymentMapper.toPersistence(entity);
    const doc = new this.model(data);
    const saved = await doc.save();
    return DeviceDeploymentMapper.toDomain(saved);
  }

  async createMany(entities: DeviceDeployment[]): Promise<number> {
    const docs = entities.map((e) => DeviceDeploymentMapper.toPersistence(e));
    const result = await this.model.insertMany(docs);
    return result.length;
  }

  async update(id: string, updates: Partial<DeviceDeployment>): Promise<DeviceDeployment> {
    const updateData: Record<string, unknown> = {};

    if (updates.status !== undefined) updateData['status'] = updates.status;
    if (updates.progress !== undefined) updateData['progress'] = updates.progress;
    if (updates.metrics !== undefined) updateData['metrics'] = updates.metrics;
    if (updates.errors !== undefined) updateData['errors'] = updates.errors;
    if (updates.completedAt !== undefined) updateData['completedAt'] = updates.completedAt;
    if (updates.rollbackReason !== undefined) updateData['rollbackReason'] = updates.rollbackReason;
    updateData['updatedAt'] = new Date();

    const doc = await this.model
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!doc) throw new Error(`DeviceDeployment not found: ${id}`);
    return DeviceDeploymentMapper.toDomain(doc);
  }

  async updateStatus(id: string, status: DeviceDeploymentStatus, progress?: number): Promise<void> {
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (progress !== undefined) updateData['progress'] = progress;
    await this.model.findByIdAndUpdate(id, { $set: updateData }).exec();
  }

  async getStats(deploymentId: string): Promise<IDeviceDeploymentStats> {
    const results = await this.model.aggregate([
      { $match: { deploymentId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const stats: IDeviceDeploymentStats = {
      total: 0, pending: 0, downloading: 0, downloaded: 0, installing: 0,
      rebooting: 0, succeeded: 0, failed: 0, rolledBack: 0, skipped: 0,
    };

    for (const r of results) {
      const count = r.count as number;
      stats.total += count;
      const key = r._id.toLowerCase() as keyof Omit<IDeviceDeploymentStats, 'total'>;
      if (key in stats) stats[key] = count;
    }

    return stats;
  }

  async countByStatus(deploymentId: string, statuses: DeviceDeploymentStatus[]): Promise<number> {
    return this.model.countDocuments({ deploymentId, status: { $in: statuses } }).exec();
  }

  private buildQuery(filter: IDeviceDeploymentFilter): FilterQuery<DeviceDeploymentDocument> {
    const query: FilterQuery<DeviceDeploymentDocument> = {};
    if (filter.deploymentId) query.deploymentId = filter.deploymentId;
    if (filter.deviceId) query.deviceId = filter.deviceId;
    if (filter.firmwareId) query.firmwareId = filter.firmwareId;
    if (filter.status) {
      query.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status;
    }
    return query;
  }
}

