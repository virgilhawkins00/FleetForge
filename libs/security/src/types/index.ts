/**
 * Security Types and Interfaces
 */

// Import from @fleetforge/core to use in interfaces and re-export
import { UserRole, Permission, ROLE_PERMISSIONS } from '@fleetforge/core';

// Re-export for backward compatibility
export { UserRole, Permission, ROLE_PERMISSIONS };

export interface IJwtPayload {
  sub: string; // User ID or Device ID
  email?: string;
  role: UserRole;
  permissions: Permission[];
  type: 'user' | 'device';
  organizationId?: string; // Tenant ID for multi-tenancy
  organizationPlan?: string; // Plan for quota checking
  iat?: number;
  exp?: number;
}

export interface IAuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  organizationName?: string;
  organizationPlan?: string;
}

export interface ITenantContext {
  organizationId: string;
  organizationName?: string;
  plan: string;
  quotas: {
    maxDevices: number;
    maxFleets: number;
    maxUsers: number;
  };
}

export interface IAuthDevice {
  id: string;
  serialNumber: string;
  fleetId: string;
  permissions: Permission[];
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ISignatureValidationResult {
  isValid: boolean;
  algorithm: string;
  timestamp: Date;
  errors?: string[];
}

export interface IEncryptionOptions {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyDerivation?: 'pbkdf2' | 'scrypt';
  iterations?: number;
}
