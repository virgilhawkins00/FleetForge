/**
 * Telemetry MongoDB Repository
 * Implements ITelemetryRepository from @fleetforge/core
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Telemetry, ITelemetryRepository, ITelemetryFilter } from '@fleetforge/core';
import { TelemetryModel, TelemetryDocument } from '../schemas';
import { TelemetryMapper } from '../mappers';

@Injectable()
export class TelemetryRepository implements ITelemetryRepository {
  constructor(
    @InjectModel(TelemetryModel.name)
    private readonly telemetryModel: Model<TelemetryDocument>,
  ) {}

  async findById(id: string): Promise<Telemetry | null> {
    const doc = await this.telemetryModel.findById(id).exec();
    return doc ? TelemetryMapper.toDomain(doc) : null;
  }

  async findMany(
    filter: ITelemetryFilter,
    limit = 100,
    offset = 0,
  ): Promise<Telemetry[]> {
    const query = this.buildQuery(filter);
    const docs = await this.telemetryModel
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ timestamp: -1 })
      .exec();
    return docs.map(TelemetryMapper.toDomain);
  }

  async findLatestByDevice(deviceId: string): Promise<Telemetry | null> {
    const doc = await this.telemetryModel
      .findOne({ deviceId })
      .sort({ timestamp: -1 })
      .exec();
    return doc ? TelemetryMapper.toDomain(doc) : null;
  }

  async create(telemetry: Telemetry): Promise<Telemetry> {
    const data = TelemetryMapper.toPersistence(telemetry);
    const doc = new this.telemetryModel(data);
    const saved = await doc.save();
    return TelemetryMapper.toDomain(saved);
  }

  async bulkCreate(telemetryList: Telemetry[]): Promise<Telemetry[]> {
    const data = telemetryList.map(TelemetryMapper.toPersistence);
    const docs = await this.telemetryModel.insertMany(data);
    return docs.map((doc) => TelemetryMapper.toDomain(doc as TelemetryDocument));
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.telemetryModel
      .deleteMany({ timestamp: { $lt: date } })
      .exec();
    return result.deletedCount;
  }

  async count(filter: ITelemetryFilter): Promise<number> {
    const query = this.buildQuery(filter);
    return this.telemetryModel.countDocuments(query).exec();
  }

  private buildQuery(filter: ITelemetryFilter): FilterQuery<TelemetryDocument> {
    const query: FilterQuery<TelemetryDocument> = {};

    if (filter.deviceId) {
      query.deviceId = filter.deviceId;
    }
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) {
        query.timestamp.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.timestamp.$lte = filter.endDate;
      }
    }

    return query;
  }
}

