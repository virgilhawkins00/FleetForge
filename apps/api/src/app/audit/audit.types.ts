/**
 * Audit Log Types
 * Defines the structure for audit events
 */

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Device Management
  DEVICE_CREATE = 'DEVICE_CREATE',
  DEVICE_UPDATE = 'DEVICE_UPDATE',
  DEVICE_DELETE = 'DEVICE_DELETE',
  DEVICE_ACTIVATE = 'DEVICE_ACTIVATE',
  DEVICE_SUSPEND = 'DEVICE_SUSPEND',
  DEVICE_DECOMMISSION = 'DEVICE_DECOMMISSION',

  // Fleet Management
  FLEET_CREATE = 'FLEET_CREATE',
  FLEET_UPDATE = 'FLEET_UPDATE',
  FLEET_DELETE = 'FLEET_DELETE',

  // Firmware Management
  FIRMWARE_UPLOAD = 'FIRMWARE_UPLOAD',
  FIRMWARE_DELETE = 'FIRMWARE_DELETE',

  // Deployment Management
  DEPLOYMENT_CREATE = 'DEPLOYMENT_CREATE',
  DEPLOYMENT_START = 'DEPLOYMENT_START',
  DEPLOYMENT_CANCEL = 'DEPLOYMENT_CANCEL',
  DEPLOYMENT_ROLLBACK = 'DEPLOYMENT_ROLLBACK',

  // Shadow Management
  SHADOW_UPDATE = 'SHADOW_UPDATE',

  // Administrative
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',

  // System
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  BULK_OPERATION = 'BULK_OPERATION',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string;
  userType: 'user' | 'device' | 'system';
  userEmail?: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

export interface AuditableOptions {
  action: AuditAction;
  severity?: AuditSeverity;
  resourceType: string;
  resourceIdParam?: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
}

