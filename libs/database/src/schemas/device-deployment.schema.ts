/**
 * DeviceDeployment MongoDB Schema
 * Tracks individual device deployment status
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDeploymentDocument = HydratedDocument<DeviceDeploymentModel>;

export enum DeviceDeploymentStatus {
  PENDING = 'PENDING',
  DOWNLOADING = 'DOWNLOADING',
  DOWNLOADED = 'DOWNLOADED',
  INSTALLING = 'INSTALLING',
  REBOOTING = 'REBOOTING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  SKIPPED = 'SKIPPED',
}

@Schema({ _id: false })
export class DeviceDeploymentErrorModel {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ required: true })
  retryable!: boolean;
}

@Schema({ _id: false })
export class DeviceDeploymentMetricsModel {
  @Prop()
  downloadStartedAt?: Date;

  @Prop()
  downloadCompletedAt?: Date;

  @Prop()
  installStartedAt?: Date;

  @Prop()
  installCompletedAt?: Date;

  @Prop()
  downloadDurationMs?: number;

  @Prop()
  installDurationMs?: number;

  @Prop({ default: 0 })
  downloadRetries!: number;

  @Prop({ default: 0 })
  installRetries!: number;
}

@Schema({ collection: 'device_deployments', timestamps: true })
export class DeviceDeploymentModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, index: true })
  deploymentId!: string;

  @Prop({ required: true, index: true })
  deviceId!: string;

  @Prop({ required: true, index: true })
  firmwareId!: string;

  @Prop({ required: true, enum: DeviceDeploymentStatus, index: true })
  status!: DeviceDeploymentStatus;

  @Prop()
  previousFirmwareVersion?: string;

  @Prop({ required: true })
  targetFirmwareVersion!: string;

  @Prop({ required: true, default: 0 })
  progress!: number;

  @Prop({ type: DeviceDeploymentMetricsModel, required: true })
  metrics!: DeviceDeploymentMetricsModel;

  @Prop({ type: [DeviceDeploymentErrorModel], default: [] })
  errors!: DeviceDeploymentErrorModel[];

  @Prop()
  completedAt?: Date;

  @Prop()
  rollbackReason?: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const DeviceDeploymentSchema = SchemaFactory.createForClass(DeviceDeploymentModel);

// Compound indexes for efficient queries
DeviceDeploymentSchema.index({ deploymentId: 1, status: 1 });
DeviceDeploymentSchema.index({ deviceId: 1, createdAt: -1 });
DeviceDeploymentSchema.index({ deploymentId: 1, deviceId: 1 }, { unique: true });

