/**
 * Deployment MongoDB Schema
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DeploymentStatus, DeploymentStrategy } from '@fleetforge/core';

export type DeploymentDocument = HydratedDocument<DeploymentModel>;

@Schema({ _id: false })
export class DeploymentTargetModel {
  @Prop({ type: [String] })
  deviceIds?: string[];

  @Prop({ type: [String] })
  fleetIds?: string[];

  @Prop({ type: [String] })
  tags?: string[];

  @Prop()
  percentage?: number;
}

@Schema({ _id: false })
export class CanaryConfigModel {
  @Prop({ default: 5 })
  percentage?: number;

  @Prop({ default: 30 })
  observationTimeMinutes?: number;

  @Prop({ default: 95 })
  successThreshold?: number;

  @Prop({ default: true })
  autoPromote?: boolean;

  @Prop({ default: 30 })
  healthCheckIntervalSeconds?: number;
}

@Schema({ _id: false })
export class RollingConfigModel {
  @Prop()
  batchSize?: number;

  @Prop({ default: 10 })
  batchPercentage?: number;

  @Prop({ default: 5 })
  batchDelayMinutes?: number;

  @Prop({ default: 1 })
  maxConcurrentBatches?: number;

  @Prop({ default: true })
  verifyHealthBetweenBatches?: boolean;

  @Prop({ default: true })
  pauseOnBatchFailure?: boolean;

  @Prop({ default: 10 })
  batchFailureThreshold?: number;
}

@Schema({ _id: false })
export class DeploymentWaveModel {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  percentage!: number;

  @Prop()
  delayMinutes?: number;

  @Prop({ default: false })
  requireApproval?: boolean;

  @Prop({ type: [String] })
  targetTags?: string[];
}

@Schema({ _id: false })
export class PhasedConfigModel {
  @Prop({ type: [DeploymentWaveModel] })
  waves?: DeploymentWaveModel[];

  @Prop({ default: 5 })
  phaseCount?: number;

  @Prop({ default: 60 })
  phaseDelayMinutes?: number;

  @Prop({ default: false })
  requireApproval?: boolean;

  @Prop({ default: true })
  autoAdvance?: boolean;

  @Prop({ default: 90 })
  advanceThreshold?: number;
}

@Schema({ _id: false })
export class DeploymentConfigModel {
  @Prop({ required: true, enum: DeploymentStrategy })
  strategy!: DeploymentStrategy;

  @Prop({ type: DeploymentTargetModel, required: true })
  target!: DeploymentTargetModel;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  canaryPercentage?: number;

  @Prop()
  phaseCount?: number;

  @Prop()
  phaseDuration?: number;

  @Prop({ default: true })
  autoRollback?: boolean;

  @Prop({ default: 10 })
  rollbackThreshold?: number;

  @Prop({ type: CanaryConfigModel })
  canary?: CanaryConfigModel;

  @Prop({ type: RollingConfigModel })
  rolling?: RollingConfigModel;

  @Prop({ type: PhasedConfigModel })
  phased?: PhasedConfigModel;
}

@Schema({ _id: false })
export class DeploymentProgressModel {
  @Prop({ required: true, default: 0 })
  total!: number;

  @Prop({ required: true, default: 0 })
  pending!: number;

  @Prop({ required: true, default: 0 })
  inProgress!: number;

  @Prop({ required: true, default: 0 })
  succeeded!: number;

  @Prop({ required: true, default: 0 })
  failed!: number;

  @Prop({ required: true, default: 0 })
  rolledBack!: number;
}

@Schema({ collection: 'deployments', timestamps: true })
export class DeploymentModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, index: true })
  firmwareId!: string;

  @Prop({ required: true })
  firmwareVersion!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: DeploymentStatus, index: true })
  status!: DeploymentStatus;

  @Prop({ type: DeploymentConfigModel, required: true })
  config!: DeploymentConfigModel;

  @Prop({ type: DeploymentProgressModel, required: true })
  progress!: DeploymentProgressModel;

  @Prop({ required: true, index: true })
  createdBy!: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  errors!: string[];

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const DeploymentSchema = SchemaFactory.createForClass(DeploymentModel);

// Indexes
DeploymentSchema.index({ firmwareId: 1, status: 1 });
DeploymentSchema.index({ status: 1, startedAt: -1 });
