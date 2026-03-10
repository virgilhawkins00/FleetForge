/**
 * Firmware MongoDB Repository
 * Implements IFirmwareRepository from @fleetforge/core
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Firmware, IFirmwareRepository, IFirmwareFilter, FirmwareStatus } from '@fleetforge/core';
import { FirmwareModel, FirmwareDocument } from '../schemas';
import { FirmwareMapper } from '../mappers';

@Injectable()
export class FirmwareRepository implements IFirmwareRepository {
  constructor(
    @InjectModel(FirmwareModel.name)
    private readonly firmwareModel: Model<FirmwareDocument>,
  ) {}

  async findById(id: string): Promise<Firmware | null> {
    const doc = await this.firmwareModel.findById(id).exec();
    return doc ? FirmwareMapper.toDomain(doc) : null;
  }

  async findByVersion(version: string): Promise<Firmware | null> {
    const doc = await this.firmwareModel.findOne({ version }).exec();
    return doc ? FirmwareMapper.toDomain(doc) : null;
  }

  async findMany(
    filter: IFirmwareFilter,
    limit = 100,
    offset = 0,
  ): Promise<Firmware[]> {
    const query = this.buildQuery(filter);
    const docs = await this.firmwareModel
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(FirmwareMapper.toDomain);
  }

  async findLatest(deviceType: string): Promise<Firmware | null> {
    const doc = await this.firmwareModel
      .findOne({
        'metadata.deviceTypes': deviceType,
        status: FirmwareStatus.DEPLOYED,
      })
      .sort({ publishedAt: -1 })
      .exec();
    return doc ? FirmwareMapper.toDomain(doc) : null;
  }

  async create(firmware: Firmware): Promise<Firmware> {
    const data = FirmwareMapper.toPersistence(firmware);
    const doc = new this.firmwareModel(data);
    const saved = await doc.save();
    return FirmwareMapper.toDomain(saved);
  }

  async update(id: string, firmware: Partial<Firmware>): Promise<Firmware> {
    const updateData: Record<string, unknown> = {};

    if (firmware.name !== undefined) updateData['name'] = firmware.name;
    if (firmware.status !== undefined) updateData['status'] = firmware.status;
    if (firmware.metadata !== undefined) updateData['metadata'] = firmware.metadata;
    if (firmware.publishedAt !== undefined) updateData['publishedAt'] = firmware.publishedAt;
    updateData['updatedAt'] = new Date();

    const doc = await this.firmwareModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!doc) {
      throw new Error(`Firmware not found: ${id}`);
    }
    return FirmwareMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.firmwareModel.findByIdAndDelete(id).exec();
  }

  async count(filter: IFirmwareFilter): Promise<number> {
    const query = this.buildQuery(filter);
    return this.firmwareModel.countDocuments(query).exec();
  }

  private buildQuery(filter: IFirmwareFilter): FilterQuery<FirmwareDocument> {
    const query: FilterQuery<FirmwareDocument> = {};

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.deviceTypes && filter.deviceTypes.length > 0) {
      query['metadata.deviceTypes'] = { $in: filter.deviceTypes };
    }
    if (filter.createdBy) {
      query.createdBy = filter.createdBy;
    }

    return query;
  }
}

