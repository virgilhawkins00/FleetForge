/**
 * Audit Decorator
 * Marks controller methods for automatic audit logging
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AuditableOptions, AuditAction, AuditSeverity } from './audit.types';

export const AUDIT_KEY = 'audit:options';

/**
 * Mark a controller method as auditable
 * 
 * @example
 * @Auditable({
 *   action: AuditAction.DEVICE_CREATE,
 *   resourceType: 'device',
 *   severity: AuditSeverity.MEDIUM,
 * })
 * @Post()
 * async createDevice(@Body() dto: CreateDeviceDto) { ... }
 */
export function Auditable(options: AuditableOptions) {
  return applyDecorators(
    SetMetadata(AUDIT_KEY, {
      ...options,
      severity: options.severity || AuditSeverity.MEDIUM,
      includeRequestBody: options.includeRequestBody ?? true,
      includeResponseBody: options.includeResponseBody ?? false,
      sensitiveFields: options.sensitiveFields || [],
    }),
  );
}

/**
 * Pre-configured decorators for common audit actions
 */

// Authentication
export const AuditLogin = () =>
  Auditable({
    action: AuditAction.LOGIN,
    resourceType: 'auth',
    severity: AuditSeverity.HIGH,
    sensitiveFields: ['password'],
  });

export const AuditLogout = () =>
  Auditable({
    action: AuditAction.LOGOUT,
    resourceType: 'auth',
    severity: AuditSeverity.LOW,
  });

// Device Management
export const AuditDeviceCreate = () =>
  Auditable({
    action: AuditAction.DEVICE_CREATE,
    resourceType: 'device',
    severity: AuditSeverity.MEDIUM,
  });

export const AuditDeviceUpdate = (idParam = 'id') =>
  Auditable({
    action: AuditAction.DEVICE_UPDATE,
    resourceType: 'device',
    resourceIdParam: idParam,
    severity: AuditSeverity.MEDIUM,
  });

export const AuditDeviceDelete = (idParam = 'id') =>
  Auditable({
    action: AuditAction.DEVICE_DELETE,
    resourceType: 'device',
    resourceIdParam: idParam,
    severity: AuditSeverity.HIGH,
  });

// Fleet Management
export const AuditFleetCreate = () =>
  Auditable({
    action: AuditAction.FLEET_CREATE,
    resourceType: 'fleet',
    severity: AuditSeverity.MEDIUM,
  });

export const AuditFleetUpdate = (idParam = 'id') =>
  Auditable({
    action: AuditAction.FLEET_UPDATE,
    resourceType: 'fleet',
    resourceIdParam: idParam,
    severity: AuditSeverity.MEDIUM,
  });

export const AuditFleetDelete = (idParam = 'id') =>
  Auditable({
    action: AuditAction.FLEET_DELETE,
    resourceType: 'fleet',
    resourceIdParam: idParam,
    severity: AuditSeverity.HIGH,
  });

// Firmware Management
export const AuditFirmwareUpload = () =>
  Auditable({
    action: AuditAction.FIRMWARE_UPLOAD,
    resourceType: 'firmware',
    severity: AuditSeverity.HIGH,
    includeRequestBody: false,
  });

export const AuditFirmwareDelete = (idParam = 'id') =>
  Auditable({
    action: AuditAction.FIRMWARE_DELETE,
    resourceType: 'firmware',
    resourceIdParam: idParam,
    severity: AuditSeverity.HIGH,
  });

// Deployment Management
export const AuditDeploymentCreate = () =>
  Auditable({
    action: AuditAction.DEPLOYMENT_CREATE,
    resourceType: 'deployment',
    severity: AuditSeverity.HIGH,
  });

export const AuditDeploymentStart = (idParam = 'id') =>
  Auditable({
    action: AuditAction.DEPLOYMENT_START,
    resourceType: 'deployment',
    resourceIdParam: idParam,
    severity: AuditSeverity.HIGH,
  });

export const AuditDeploymentCancel = (idParam = 'id') =>
  Auditable({
    action: AuditAction.DEPLOYMENT_CANCEL,
    resourceType: 'deployment',
    resourceIdParam: idParam,
    severity: AuditSeverity.HIGH,
  });

export const AuditDeploymentRollback = (idParam = 'id') =>
  Auditable({
    action: AuditAction.DEPLOYMENT_ROLLBACK,
    resourceType: 'deployment',
    resourceIdParam: idParam,
    severity: AuditSeverity.CRITICAL,
  });

