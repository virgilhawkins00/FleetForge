/**
 * Device MongoDB Schema
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DeviceStatus, DeviceType, DeviceLifecycleEvent } from '@fleetforge/core';

export type DeviceDocument = HydratedDocument<DeviceModel>;

@Schema({ _id: false })
export class DeviceMetadataModel {
  @Prop({ required: true })
  manufacturer!: string;

  @Prop({ required: true })
  model!: string;

  @Prop({ required: true })
  hardwareVersion!: string;

  @Prop({ required: true })
  serialNumber!: string;

  @Prop()
  manufactureDate?: Date;
}

@Schema({ _id: false })
export class DeviceCapabilitiesModel {
  @Prop({ default: false })
  hasGPS!: boolean;

  @Prop({ default: false })
  hasCamera!: boolean;

  @Prop({ default: false })
  hasCellular!: boolean;

  @Prop({ default: false })
  hasWiFi!: boolean;

  @Prop({ default: false })
  hasBluetooth!: boolean;

  @Prop({ type: [String], default: [] })
  sensors!: string[];
}

@Schema({ _id: false })
export class DeviceHealthModel {
  @Prop()
  batteryLevel?: number;

  @Prop()
  signalStrength?: number;

  @Prop()
  temperature?: number;

  @Prop()
  memoryUsage?: number;

  @Prop()
  cpuUsage?: number;

  @Prop({ required: true })
  lastHealthCheck!: Date;
}

@Schema({ _id: false })
export class LocationModel {
  @Prop({ required: true })
  latitude!: number;

  @Prop({ required: true })
  longitude!: number;

  @Prop()
  altitude?: number;

  @Prop()
  accuracy?: number;

  @Prop()
  speed?: number;

  @Prop()
  heading?: number;

  @Prop({ required: true })
  timestamp!: Date;
}

@Schema({ _id: false })
export class DeviceLifecycleTimestampsModel {
  @Prop()
  provisionedAt?: Date;

  @Prop()
  registeredAt?: Date;

  @Prop()
  activatedAt?: Date;

  @Prop()
  suspendedAt?: Date;

  @Prop()
  decommissionedAt?: Date;
}

@Schema({ _id: false })
export class LifecycleHistoryEntryModel {
  @Prop({ type: String, required: true, enum: Object.values(DeviceLifecycleEvent) })
  event!: DeviceLifecycleEvent;

  @Prop({ type: String, required: true, enum: Object.values(DeviceStatus) })
  fromStatus!: DeviceStatus;

  @Prop({ type: String, required: true, enum: Object.values(DeviceStatus) })
  toStatus!: DeviceStatus;

  @Prop({ type: Date, required: true })
  timestamp!: Date;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: String })
  performedBy?: string;
}

@Schema({ collection: 'devices', timestamps: true })
export class DeviceModel {
  @Prop({ type: String, required: true, unique: true })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  fleetId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: Object.values(DeviceType) })
  type!: DeviceType;

  @Prop({ type: String, required: true, enum: Object.values(DeviceStatus), index: true })
  status!: DeviceStatus;

  @Prop({ type: DeviceMetadataModel, required: true })
  metadata!: DeviceMetadataModel;

  @Prop({ type: DeviceCapabilitiesModel, required: true })
  capabilities!: DeviceCapabilitiesModel;

  @Prop({ type: String, required: true, index: true })
  firmwareVersion!: string;

  @Prop({ type: Date, required: true, index: true })
  lastSeen!: Date;

  @Prop({ type: LocationModel })
  location?: LocationModel;

  @Prop({ type: DeviceHealthModel })
  health?: DeviceHealthModel;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: DeviceLifecycleTimestampsModel, default: {} })
  lifecycleTimestamps!: DeviceLifecycleTimestampsModel;

  @Prop({ type: [LifecycleHistoryEntryModel], default: [] })
  lifecycleHistory!: LifecycleHistoryEntryModel[];

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(DeviceModel);

// Compound indexes (single-field indexes are defined via @Prop decorator)
DeviceSchema.index({ fleetId: 1, status: 1 });
DeviceSchema.index({ firmwareVersion: 1, status: 1 });
DeviceSchema.index({ 'lifecycleTimestamps.activatedAt': 1 });
DeviceSchema.index({ 'lifecycleTimestamps.decommissionedAt': 1 });
