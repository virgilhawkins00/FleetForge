/**
 * Device Shadow (Digital Twin) MongoDB Schema
 * Implements AWS IoT Device Shadow pattern for state synchronization
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceShadowDocument = HydratedDocument<DeviceShadowModel>;

/**
 * Shadow state metadata - tracks versioning and timestamps
 */
@Schema({ _id: false })
export class ShadowMetadataModel {
  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ required: true, default: 1 })
  version!: number;
}

/**
 * Generic state container for reported/desired state
 * Uses flexible Record type to support various device configurations
 */
@Schema({ _id: false })
export class ShadowStateModel {
  @Prop({ type: Object, default: {} })
  state!: Record<string, unknown>;

  @Prop({ type: ShadowMetadataModel })
  metadata?: ShadowMetadataModel;
}

/**
 * Device Shadow Model
 * Maintains synchronization between device (reported) and cloud (desired) state
 */
@Schema({ collection: 'device_shadows', timestamps: true })
export class DeviceShadowModel {
  @Prop({ required: true, unique: true })
  _id!: string; // Same as device ID for 1:1 mapping

  @Prop({ required: true, index: true })
  deviceId!: string;

  @Prop({ type: ShadowStateModel, required: true })
  reported!: ShadowStateModel;

  @Prop({ type: ShadowStateModel, required: true })
  desired!: ShadowStateModel;

  @Prop({ type: Object, default: {} })
  delta!: Record<string, unknown>;

  @Prop({ default: false })
  hasDelta!: boolean;

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;

  @Prop()
  lastReportedAt?: Date;

  @Prop()
  lastDesiredAt?: Date;

  @Prop()
  lastSyncedAt?: Date;
}

export const DeviceShadowSchema = SchemaFactory.createForClass(DeviceShadowModel);

// Index for finding shadows with pending deltas
DeviceShadowSchema.index({ hasDelta: 1, deviceId: 1 });
// Index for version-based queries
DeviceShadowSchema.index({ deviceId: 1, version: 1 });

