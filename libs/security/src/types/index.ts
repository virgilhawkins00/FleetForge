/**
 * Security Types and Interfaces
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FLEET_MANAGER = 'FLEET_MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
  DEVICE = 'DEVICE', // For device-to-server authentication
}

export enum Permission {
  // Device permissions
  DEVICE_READ = 'device:read',
  DEVICE_WRITE = 'device:write',
  DEVICE_DELETE = 'device:delete',
  DEVICE_MANAGE = 'device:manage',

  // Firmware permissions
  FIRMWARE_READ = 'firmware:read',
  FIRMWARE_WRITE = 'firmware:write',
  FIRMWARE_DELETE = 'firmware:delete',
  FIRMWARE_DEPLOY = 'firmware:deploy',

  // Deployment permissions
  DEPLOYMENT_READ = 'deployment:read',
  DEPLOYMENT_CREATE = 'deployment:create',
  DEPLOYMENT_CANCEL = 'deployment:cancel',
  DEPLOYMENT_ROLLBACK = 'deployment:rollback',

  // Fleet permissions
  FLEET_READ = 'fleet:read',
  FLEET_WRITE = 'fleet:write',
  FLEET_DELETE = 'fleet:delete',

  // Telemetry permissions
  TELEMETRY_READ = 'telemetry:read',
  TELEMETRY_WRITE = 'telemetry:write',

  // User management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // System
  SYSTEM_ADMIN = 'system:admin',
}

export interface IJwtPayload {
  sub: string; // User ID or Device ID
  email?: string;
  role: UserRole;
  permissions: Permission[];
  type: 'user' | 'device';
  iat?: number;
  exp?: number;
}

export interface IAuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
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

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.DEVICE_READ,
    Permission.DEVICE_WRITE,
    Permission.DEVICE_DELETE,
    Permission.DEVICE_MANAGE,
    Permission.FIRMWARE_READ,
    Permission.FIRMWARE_WRITE,
    Permission.FIRMWARE_DEPLOY,
    Permission.DEPLOYMENT_READ,
    Permission.DEPLOYMENT_CREATE,
    Permission.DEPLOYMENT_CANCEL,
    Permission.DEPLOYMENT_ROLLBACK,
    Permission.FLEET_READ,
    Permission.FLEET_WRITE,
    Permission.FLEET_DELETE,
    Permission.TELEMETRY_READ,
    Permission.TELEMETRY_WRITE,
    Permission.USER_READ,
  ],
  [UserRole.FLEET_MANAGER]: [
    Permission.DEVICE_READ,
    Permission.DEVICE_WRITE,
    Permission.FIRMWARE_READ,
    Permission.FIRMWARE_DEPLOY,
    Permission.DEPLOYMENT_READ,
    Permission.DEPLOYMENT_CREATE,
    Permission.FLEET_READ,
    Permission.FLEET_WRITE,
    Permission.TELEMETRY_READ,
  ],
  [UserRole.OPERATOR]: [
    Permission.DEVICE_READ,
    Permission.FIRMWARE_READ,
    Permission.DEPLOYMENT_READ,
    Permission.FLEET_READ,
    Permission.TELEMETRY_READ,
    Permission.TELEMETRY_WRITE,
  ],
  [UserRole.VIEWER]: [
    Permission.DEVICE_READ,
    Permission.FIRMWARE_READ,
    Permission.DEPLOYMENT_READ,
    Permission.FLEET_READ,
    Permission.TELEMETRY_READ,
  ],
  [UserRole.DEVICE]: [Permission.TELEMETRY_WRITE, Permission.FIRMWARE_READ],
};

