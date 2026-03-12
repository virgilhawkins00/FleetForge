/**
 * Firmware MongoDB Schema
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FirmwareStatus, FirmwareType } from '@fleetforge/core';

export type FirmwareDocument = HydratedDocument<FirmwareModel>;

@Schema({ _id: false })
export class FirmwareMetadataModel {
  @Prop({ type: [String], required: true })
  deviceTypes!: string[];

  @Prop()
  minHardwareVersion?: string;

  @Prop()
  maxHardwareVersion?: string;

  @Prop({ type: [String] })
  requiredCapabilities?: string[];

  @Prop()
  releaseNotes?: string;

  @Prop()
  changelog?: string;
}

@Schema({ _id: false })
export class FirmwareFileModel {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true })
  checksum!: string;

  @Prop({ required: true })
  checksumAlgorithm!: string;
}

@Schema({ _id: false })
export class FirmwareSignatureModel {
  @Prop({ required: true })
  algorithm!: string;

  @Prop({ required: true })
  signature!: string;

  @Prop({ required: true })
  publicKey!: string;

  @Prop({ required: true })
  timestamp!: Date;
}

@Schema({ collection: 'firmwares', timestamps: true })
export class FirmwareModel {
  @Prop({ type: String, required: true, unique: true })
  _id!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  version!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: Object.values(FirmwareType) })
  type!: FirmwareType;

  @Prop({ type: String, required: true, enum: Object.values(FirmwareStatus), index: true })
  status!: FirmwareStatus;

  @Prop({ type: FirmwareFileModel, required: true })
  file!: FirmwareFileModel;

  @Prop({ type: FirmwareSignatureModel, required: true })
  signature!: FirmwareSignatureModel;

  @Prop({ type: FirmwareMetadataModel, required: true })
  metadata!: FirmwareMetadataModel;

  @Prop({ type: String, required: true, index: true })
  createdBy!: string;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const FirmwareSchema = SchemaFactory.createForClass(FirmwareModel);

// Indexes
FirmwareSchema.index({ status: 1, 'metadata.deviceTypes': 1 });
FirmwareSchema.index({ createdBy: 1, status: 1 });
