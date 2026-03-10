/**
 * Fleet MongoDB Schema
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FleetDocument = HydratedDocument<FleetModel>;

@Schema({ _id: false })
export class FleetMetadataModel {
  @Prop()
  description?: string;

  @Prop()
  region?: string;

  @Prop()
  timezone?: string;

  @Prop({ type: Object })
  customFields?: Record<string, unknown>;
}

@Schema({ _id: false })
export class FleetStatisticsModel {
  @Prop({ required: true, default: 0 })
  totalDevices!: number;

  @Prop({ required: true, default: 0 })
  activeDevices!: number;

  @Prop({ required: true, default: 0 })
  offlineDevices!: number;

  @Prop({ required: true, default: 0 })
  errorDevices!: number;

  @Prop()
  averageBatteryLevel?: number;

  @Prop({ required: true })
  lastUpdated!: Date;
}

@Schema({ collection: 'fleets', timestamps: true })
export class FleetModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ type: FleetMetadataModel, default: {} })
  metadata!: FleetMetadataModel;

  @Prop({ type: [String], default: [] })
  deviceIds!: string[];

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: FleetStatisticsModel })
  statistics?: FleetStatisticsModel;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const FleetSchema = SchemaFactory.createForClass(FleetModel);

// Compound indexes (single-field indexes defined via @Prop)
FleetSchema.index({ organizationId: 1, name: 1 });
