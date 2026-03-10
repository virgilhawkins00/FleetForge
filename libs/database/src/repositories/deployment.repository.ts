/**
 * Deployment MongoDB Repository
 * Implements IDeploymentRepository from @fleetforge/core
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Deployment, IDeploymentRepository, IDeploymentFilter, DeploymentStatus } from '@fleetforge/core';
import { DeploymentModel, DeploymentDocument } from '../schemas';
import { DeploymentMapper } from '../mappers';

@Injectable()
export class DeploymentRepository implements IDeploymentRepository {
  constructor(
    @InjectModel(DeploymentModel.name)
    private readonly deploymentModel: Model<DeploymentDocument>,
  ) {}

  async findById(id: string): Promise<Deployment | null> {
    const doc = await this.deploymentModel.findById(id).exec();
    return doc ? DeploymentMapper.toDomain(doc) : null;
  }

  async findMany(
    filter: IDeploymentFilter,
    limit = 100,
    offset = 0,
  ): Promise<Deployment[]> {
    const query = this.buildQuery(filter);
    const docs = await this.deploymentModel
      .find(query)
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(DeploymentMapper.toDomain);
  }

  async findActive(): Promise<Deployment[]> {
    const docs = await this.deploymentModel
      .find({
        status: { $in: [DeploymentStatus.PENDING, DeploymentStatus.IN_PROGRESS] },
      })
      .sort({ startedAt: -1 })
      .exec();
    return docs.map(DeploymentMapper.toDomain);
  }

  async create(deployment: Deployment): Promise<Deployment> {
    const data = DeploymentMapper.toPersistence(deployment);
    const doc = new this.deploymentModel(data);
    const saved = await doc.save();
    return DeploymentMapper.toDomain(saved);
  }

  async update(id: string, deployment: Partial<Deployment>): Promise<Deployment> {
    const updateData: Record<string, unknown> = {};

    if (deployment.name !== undefined) updateData['name'] = deployment.name;
    if (deployment.status !== undefined) updateData['status'] = deployment.status;
    if (deployment.progress !== undefined) updateData['progress'] = deployment.progress;
    if (deployment.startedAt !== undefined) updateData['startedAt'] = deployment.startedAt;
    if (deployment.completedAt !== undefined) updateData['completedAt'] = deployment.completedAt;
    if (deployment.errors !== undefined) updateData['errors'] = deployment.errors;
    updateData['updatedAt'] = new Date();

    const doc = await this.deploymentModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!doc) {
      throw new Error(`Deployment not found: ${id}`);
    }
    return DeploymentMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.deploymentModel.findByIdAndDelete(id).exec();
  }

  async count(filter: IDeploymentFilter): Promise<number> {
    const query = this.buildQuery(filter);
    return this.deploymentModel.countDocuments(query).exec();
  }

  private buildQuery(filter: IDeploymentFilter): FilterQuery<DeploymentDocument> {
    const query: FilterQuery<DeploymentDocument> = {};

    if (filter.firmwareId) {
      query.firmwareId = filter.firmwareId;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.createdBy) {
      query.createdBy = filter.createdBy;
    }

    return query;
  }
}

