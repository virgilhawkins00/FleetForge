/**
 * Organization Repository - Data access for multi-tenant organizations
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Organization, OrganizationStatus, OrganizationPlan } from '@fleetforge/core';
import { OrganizationModel, OrganizationDocument } from '../schemas/organization.schema';
import { OrganizationMapper } from '../mappers/organization.mapper';

export interface OrganizationFilters {
  status?: OrganizationStatus;
  plan?: OrganizationPlan;
  ownerId?: string;
}

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(OrganizationModel.name)
    private readonly model: Model<OrganizationDocument>,
  ) {}

  async create(organization: Organization): Promise<Organization> {
    const doc = await this.model.create(OrganizationMapper.toModel(organization));
    return OrganizationMapper.toDomain(doc);
  }

  async findById(id: string): Promise<Organization | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? OrganizationMapper.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const doc = await this.model.findOne({ slug }).exec();
    return doc ? OrganizationMapper.toDomain(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Organization[]> {
    const docs = await this.model.find({ ownerId }).exec();
    return docs.map(OrganizationMapper.toDomain);
  }

  async findAll(filters?: OrganizationFilters): Promise<Organization[]> {
    const query: FilterQuery<OrganizationModel> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.plan) query['billing.plan'] = filters.plan;
    if (filters?.ownerId) query.ownerId = filters.ownerId;

    const docs = await this.model.find(query).sort({ createdAt: -1 }).exec();
    return docs.map(OrganizationMapper.toDomain);
  }

  async update(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    const updateObj: Record<string, unknown> = {};

    if (updates.name) updateObj['name'] = updates.name;
    if (updates.status) updateObj['status'] = updates.status;
    if (updates.billing) updateObj['billing'] = updates.billing;
    if (updates.quotas) updateObj['quotas'] = updates.quotas;
    if (updates.settings) updateObj['settings'] = updates.settings;
    if (updates.usage) updateObj['usage'] = updates.usage;
    updateObj['updatedAt'] = new Date();

    const doc = await this.model.findByIdAndUpdate(id, { $set: updateObj }, { new: true }).exec();
    return doc ? OrganizationMapper.toDomain(doc) : null;
  }

  async updateUsage(id: string, usage: Partial<Organization['usage']>): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, {
        $set: {
          'usage.currentDevices': usage.currentDevices,
          'usage.currentFleets': usage.currentFleets,
          'usage.currentUsers': usage.currentUsers,
          'usage.currentFirmwareStorage': usage.currentFirmwareStorage,
          'usage.currentApiRequests': usage.currentApiRequests,
          'usage.lastCalculatedAt': new Date(),
          updatedAt: new Date(),
        },
      })
      .exec();
  }

  async incrementUsage(
    id: string,
    field: keyof Organization['usage'],
    amount: number = 1,
  ): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, {
        $inc: { [`usage.${field}`]: amount },
        $set: { updatedAt: new Date() },
      })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async countByStatus(status: OrganizationStatus): Promise<number> {
    return this.model.countDocuments({ status }).exec();
  }

  async findExpiredTrials(): Promise<Organization[]> {
    const docs = await this.model
      .find({
        status: OrganizationStatus.TRIAL,
        'billing.trialEndsAt': { $lt: new Date() },
      })
      .exec();
    return docs.map(OrganizationMapper.toDomain);
  }
}
