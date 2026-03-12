/**
 * Organization Mapper - Converts between domain entity and database model
 */

import { Organization, OrganizationStatus, OrganizationPlan, PLAN_QUOTAS } from '@fleetforge/core';
import { OrganizationModel, OrganizationDocument } from '../schemas/organization.schema';

export class OrganizationMapper {
  static toDomain(model: OrganizationModel | OrganizationDocument): Organization {
    return new Organization(
      model._id,
      model.name,
      model.slug,
      model.status,
      {
        plan: model.billing.plan,
        stripeCustomerId: model.billing.stripeCustomerId,
        stripeSubscriptionId: model.billing.stripeSubscriptionId,
        trialEndsAt: model.billing.trialEndsAt,
        currentPeriodStart: model.billing.currentPeriodStart,
        currentPeriodEnd: model.billing.currentPeriodEnd,
      },
      {
        maxDevices: model.quotas.maxDevices,
        maxFleets: model.quotas.maxFleets,
        maxUsers: model.quotas.maxUsers,
        maxFirmwareStorage: model.quotas.maxFirmwareStorage,
        maxTelemetryRetention: model.quotas.maxTelemetryRetention,
        maxApiRequests: model.quotas.maxApiRequests,
      },
      {
        timezone: model.settings?.timezone || 'UTC',
        language: model.settings?.language || 'en',
        notificationsEnabled: model.settings?.notificationsEnabled ?? true,
        mfaRequired: model.settings?.mfaRequired ?? false,
        ssoEnabled: model.settings?.ssoEnabled ?? false,
        ssoProvider: model.settings?.ssoProvider,
        ssoConfig: model.settings?.ssoConfig,
      },
      {
        currentDevices: model.usage?.currentDevices || 0,
        currentFleets: model.usage?.currentFleets || 0,
        currentUsers: model.usage?.currentUsers || 0,
        currentFirmwareStorage: model.usage?.currentFirmwareStorage || 0,
        currentApiRequests: model.usage?.currentApiRequests || 0,
        lastCalculatedAt: model.usage?.lastCalculatedAt || new Date(),
      },
      model.ownerId,
      model.createdAt,
      model.updatedAt,
    );
  }

  static toModel(entity: Organization): Omit<OrganizationModel, 'createdAt' | 'updatedAt'> {
    return {
      _id: entity.id,
      name: entity.name,
      slug: entity.slug,
      status: entity.status,
      billing: {
        plan: entity.billing.plan,
        stripeCustomerId: entity.billing.stripeCustomerId,
        stripeSubscriptionId: entity.billing.stripeSubscriptionId,
        trialEndsAt: entity.billing.trialEndsAt,
        currentPeriodStart: entity.billing.currentPeriodStart,
        currentPeriodEnd: entity.billing.currentPeriodEnd,
      },
      quotas: {
        maxDevices: entity.quotas.maxDevices,
        maxFleets: entity.quotas.maxFleets,
        maxUsers: entity.quotas.maxUsers,
        maxFirmwareStorage: entity.quotas.maxFirmwareStorage,
        maxTelemetryRetention: entity.quotas.maxTelemetryRetention,
        maxApiRequests: entity.quotas.maxApiRequests,
      },
      settings: {
        timezone: entity.settings.timezone,
        language: entity.settings.language,
        notificationsEnabled: entity.settings.notificationsEnabled,
        mfaRequired: entity.settings.mfaRequired,
        ssoEnabled: entity.settings.ssoEnabled,
        ssoProvider: entity.settings.ssoProvider,
        ssoConfig: entity.settings.ssoConfig,
      },
      usage: {
        currentDevices: entity.usage.currentDevices,
        currentFleets: entity.usage.currentFleets,
        currentUsers: entity.usage.currentUsers,
        currentFirmwareStorage: entity.usage.currentFirmwareStorage,
        currentApiRequests: entity.usage.currentApiRequests,
        lastCalculatedAt: entity.usage.lastCalculatedAt,
      },
      ownerId: entity.ownerId,
    };
  }

  static createDefaultOrganization(
    id: string,
    name: string,
    slug: string,
    ownerId: string,
    plan: OrganizationPlan = OrganizationPlan.FREE,
  ): Organization {
    const now = new Date();
    const trialEndsAt = plan === OrganizationPlan.FREE ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : undefined;

    return new Organization(
      id,
      name,
      slug,
      plan === OrganizationPlan.FREE ? OrganizationStatus.TRIAL : OrganizationStatus.ACTIVE,
      { plan, trialEndsAt },
      { ...PLAN_QUOTAS[plan] },
      { timezone: 'UTC', language: 'en', notificationsEnabled: true, mfaRequired: false, ssoEnabled: false },
      { currentDevices: 0, currentFleets: 0, currentUsers: 1, currentFirmwareStorage: 0, currentApiRequests: 0, lastCalculatedAt: now },
      ownerId,
      now,
      now,
    );
  }
}

