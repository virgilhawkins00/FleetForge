/**
 * Organization Schema - MongoDB schema for multi-tenant organizations
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  OrganizationPlan,
  OrganizationStatus,
  IOrganizationQuotas,
  IOrganizationBilling,
  IOrganizationSettings,
  IOrganizationUsage,
} from '@fleetforge/core';

@Schema({ _id: false })
class OrganizationQuotasModel implements IOrganizationQuotas {
  @Prop({ required: true }) maxDevices!: number;
  @Prop({ required: true }) maxFleets!: number;
  @Prop({ required: true }) maxUsers!: number;
  @Prop({ required: true }) maxFirmwareStorage!: number;
  @Prop({ required: true }) maxTelemetryRetention!: number;
  @Prop({ required: true }) maxApiRequests!: number;
}

@Schema({ _id: false })
class OrganizationBillingModel implements IOrganizationBilling {
  @Prop({ required: true, enum: OrganizationPlan }) plan!: OrganizationPlan;
  @Prop() stripeCustomerId?: string;
  @Prop() stripeSubscriptionId?: string;
  @Prop() trialEndsAt?: Date;
  @Prop() currentPeriodStart?: Date;
  @Prop() currentPeriodEnd?: Date;
}

@Schema({ _id: false })
class OrganizationSettingsModel implements IOrganizationSettings {
  @Prop({ default: 'UTC' }) timezone!: string;
  @Prop({ default: 'en' }) language!: string;
  @Prop({ default: true }) notificationsEnabled!: boolean;
  @Prop({ default: false }) mfaRequired!: boolean;
  @Prop({ default: false }) ssoEnabled!: boolean;
  @Prop() ssoProvider?: 'google' | 'azure' | 'okta' | 'saml';
  @Prop({ type: Object }) ssoConfig?: Record<string, unknown>;
}

@Schema({ _id: false })
class OrganizationUsageModel implements IOrganizationUsage {
  @Prop({ default: 0 }) currentDevices!: number;
  @Prop({ default: 0 }) currentFleets!: number;
  @Prop({ default: 0 }) currentUsers!: number;
  @Prop({ default: 0 }) currentFirmwareStorage!: number;
  @Prop({ default: 0 }) currentApiRequests!: number;
  @Prop({ default: Date.now }) lastCalculatedAt!: Date;
}

@Schema({ collection: 'organizations', timestamps: true })
export class OrganizationModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, enum: OrganizationStatus, index: true })
  status!: OrganizationStatus;

  @Prop({ type: OrganizationBillingModel, required: true })
  billing!: OrganizationBillingModel;

  @Prop({ type: OrganizationQuotasModel, required: true })
  quotas!: OrganizationQuotasModel;

  @Prop({ type: OrganizationSettingsModel, default: {} })
  settings!: OrganizationSettingsModel;

  @Prop({ type: OrganizationUsageModel, default: {} })
  usage!: OrganizationUsageModel;

  @Prop({ required: true, index: true })
  ownerId!: string;

  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export type OrganizationDocument = OrganizationModel & Document;
export const OrganizationSchema = SchemaFactory.createForClass(OrganizationModel);

// Indexes
OrganizationSchema.index({ 'billing.plan': 1, status: 1 });
OrganizationSchema.index({ ownerId: 1 });

