/**
 * Organization Entity - Core domain model for multi-tenant organizations
 * Implements Enterprise SaaS multi-tenancy pattern
 */

export enum OrganizationPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  TRIAL = 'trial',
}

export interface IOrganizationQuotas {
  maxDevices: number;
  maxFleets: number;
  maxUsers: number;
  maxFirmwareStorage: number; // in bytes
  maxTelemetryRetention: number; // in days
  maxApiRequests: number; // per month
}

export interface IOrganizationBilling {
  plan: OrganizationPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface IOrganizationSettings {
  timezone: string;
  language: string;
  notificationsEnabled: boolean;
  mfaRequired: boolean;
  ssoEnabled: boolean;
  ssoProvider?: 'google' | 'azure' | 'okta' | 'saml';
  ssoConfig?: Record<string, unknown>;
}

export interface IOrganizationUsage {
  currentDevices: number;
  currentFleets: number;
  currentUsers: number;
  currentFirmwareStorage: number;
  currentApiRequests: number;
  lastCalculatedAt: Date;
}

export const PLAN_QUOTAS: Record<OrganizationPlan, IOrganizationQuotas> = {
  [OrganizationPlan.FREE]: {
    maxDevices: 10,
    maxFleets: 2,
    maxUsers: 3,
    maxFirmwareStorage: 100 * 1024 * 1024, // 100MB
    maxTelemetryRetention: 7,
    maxApiRequests: 10000,
  },
  [OrganizationPlan.STARTER]: {
    maxDevices: 100,
    maxFleets: 10,
    maxUsers: 10,
    maxFirmwareStorage: 1024 * 1024 * 1024, // 1GB
    maxTelemetryRetention: 30,
    maxApiRequests: 100000,
  },
  [OrganizationPlan.PROFESSIONAL]: {
    maxDevices: 1000,
    maxFleets: 50,
    maxUsers: 50,
    maxFirmwareStorage: 10 * 1024 * 1024 * 1024, // 10GB
    maxTelemetryRetention: 90,
    maxApiRequests: 1000000,
  },
  [OrganizationPlan.ENTERPRISE]: {
    maxDevices: -1, // unlimited
    maxFleets: -1,
    maxUsers: -1,
    maxFirmwareStorage: -1,
    maxTelemetryRetention: 365,
    maxApiRequests: -1,
  },
};

export class Organization {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public status: OrganizationStatus,
    public billing: IOrganizationBilling,
    public quotas: IOrganizationQuotas,
    public settings: IOrganizationSettings,
    public usage: IOrganizationUsage,
    public ownerId: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  isActive(): boolean {
    return this.status === OrganizationStatus.ACTIVE || this.status === OrganizationStatus.TRIAL;
  }

  canAddDevice(): boolean {
    if (this.quotas.maxDevices === -1) return true;
    return this.usage.currentDevices < this.quotas.maxDevices;
  }

  canAddFleet(): boolean {
    if (this.quotas.maxFleets === -1) return true;
    return this.usage.currentFleets < this.quotas.maxFleets;
  }

  canAddUser(): boolean {
    if (this.quotas.maxUsers === -1) return true;
    return this.usage.currentUsers < this.quotas.maxUsers;
  }

  isTrialExpired(): boolean {
    if (this.status !== OrganizationStatus.TRIAL) return false;
    if (!this.billing.trialEndsAt) return false;
    return new Date() > this.billing.trialEndsAt;
  }

  upgradePlan(newPlan: OrganizationPlan): void {
    this.billing.plan = newPlan;
    this.quotas = { ...PLAN_QUOTAS[newPlan] };
    this.updatedAt = new Date();
  }

  suspend(_reason?: string): void {
    this.status = OrganizationStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = OrganizationStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  updateUsage(usage: Partial<IOrganizationUsage>): void {
    this.usage = { ...this.usage, ...usage, lastCalculatedAt: new Date() };
    this.updatedAt = new Date();
  }
}
