/**
 * Fleet MongoDB Repository
 * Implements IFleetRepository from @fleetforge/core
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Fleet, IFleetRepository, IFleetFilter } from '@fleetforge/core';
import { FleetModel, FleetDocument } from '../schemas';
import { FleetMapper } from '../mappers';

@Injectable()
export class FleetRepository implements IFleetRepository {
  constructor(
    @InjectModel(FleetModel.name)
    private readonly fleetModel: Model<FleetDocument>,
  ) {}

  async findById(id: string): Promise<Fleet | null> {
    const doc = await this.fleetModel.findById(id).exec();
    return doc ? FleetMapper.toDomain(doc) : null;
  }

  async findMany(
    filter: IFleetFilter,
    limit = 100,
    offset = 0,
  ): Promise<Fleet[]> {
    const query = this.buildQuery(filter);
    const docs = await this.fleetModel
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ name: 1 })
      .exec();
    return docs.map(FleetMapper.toDomain);
  }

  async findByOrganization(organizationId: string): Promise<Fleet[]> {
    const docs = await this.fleetModel
      .find({ organizationId })
      .sort({ name: 1 })
      .exec();
    return docs.map(FleetMapper.toDomain);
  }

  async create(fleet: Fleet): Promise<Fleet> {
    const data = FleetMapper.toPersistence(fleet);
    const doc = new this.fleetModel(data);
    const saved = await doc.save();
    return FleetMapper.toDomain(saved);
  }

  async update(id: string, fleet: Partial<Fleet>): Promise<Fleet> {
    const updateData: Record<string, unknown> = {};

    if (fleet.name !== undefined) updateData['name'] = fleet.name;
    if (fleet.metadata !== undefined) updateData['metadata'] = fleet.metadata;
    if (fleet.deviceIds !== undefined) updateData['deviceIds'] = fleet.deviceIds;
    if (fleet.tags !== undefined) updateData['tags'] = fleet.tags;
    if (fleet.statistics !== undefined) updateData['statistics'] = fleet.statistics;
    updateData['updatedAt'] = new Date();

    const doc = await this.fleetModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!doc) {
      throw new Error(`Fleet not found: ${id}`);
    }
    return FleetMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.fleetModel.findByIdAndDelete(id).exec();
  }

  async count(filter: IFleetFilter): Promise<number> {
    const query = this.buildQuery(filter);
    return this.fleetModel.countDocuments(query).exec();
  }

  private buildQuery(filter: IFleetFilter): FilterQuery<FleetDocument> {
    const query: FilterQuery<FleetDocument> = {};

    if (filter.organizationId) {
      query.organizationId = filter.organizationId;
    }
    if (filter.tags && filter.tags.length > 0) {
      query.tags = { $all: filter.tags };
    }

    return query;
  }
}

