/**
 * Audit Decorator Unit Tests
 */

import { AUDIT_KEY, Auditable, AuditLogin, AuditLogout, AuditDeviceCreate, AuditDeviceUpdate, AuditDeviceDelete, AuditFleetCreate, AuditFleetUpdate, AuditFleetDelete, AuditFirmwareUpload, AuditFirmwareDelete, AuditDeploymentCreate, AuditDeploymentStart, AuditDeploymentCancel, AuditDeploymentRollback } from './audit.decorator';
import { AuditAction, AuditSeverity } from './audit.types';

describe('Audit Decorators', () => {
  // Helper to get metadata from decorated method
  const getMetadata = (decorator: MethodDecorator): any => {
    const target = {};
    const propertyKey = 'testMethod';
    const descriptor: PropertyDescriptor = { value: () => {} };
    decorator(target, propertyKey, descriptor);
    return Reflect.getMetadata(AUDIT_KEY, descriptor.value);
  };

  describe('Auditable', () => {
    it('should set audit metadata with default values', () => {
      const decorator = Auditable({
        action: AuditAction.DEVICE_CREATE,
        resourceType: 'device',
      });
      
      const metadata = getMetadata(decorator);
      
      expect(metadata).toEqual({
        action: AuditAction.DEVICE_CREATE,
        resourceType: 'device',
        severity: AuditSeverity.MEDIUM,
        includeRequestBody: true,
        includeResponseBody: false,
        sensitiveFields: [],
      });
    });

    it('should allow overriding default values', () => {
      const decorator = Auditable({
        action: AuditAction.LOGIN,
        resourceType: 'auth',
        severity: AuditSeverity.CRITICAL,
        includeRequestBody: false,
        includeResponseBody: true,
        sensitiveFields: ['password'],
      });
      
      const metadata = getMetadata(decorator);
      
      expect(metadata.severity).toBe(AuditSeverity.CRITICAL);
      expect(metadata.includeRequestBody).toBe(false);
      expect(metadata.includeResponseBody).toBe(true);
      expect(metadata.sensitiveFields).toEqual(['password']);
    });
  });

  describe('Authentication Decorators', () => {
    it('AuditLogin should configure login audit', () => {
      const metadata = getMetadata(AuditLogin());
      
      expect(metadata.action).toBe(AuditAction.LOGIN);
      expect(metadata.resourceType).toBe('auth');
      expect(metadata.severity).toBe(AuditSeverity.HIGH);
      expect(metadata.sensitiveFields).toContain('password');
    });

    it('AuditLogout should configure logout audit', () => {
      const metadata = getMetadata(AuditLogout());
      
      expect(metadata.action).toBe(AuditAction.LOGOUT);
      expect(metadata.severity).toBe(AuditSeverity.LOW);
    });
  });

  describe('Device Management Decorators', () => {
    it('AuditDeviceCreate should configure device creation audit', () => {
      const metadata = getMetadata(AuditDeviceCreate());
      
      expect(metadata.action).toBe(AuditAction.DEVICE_CREATE);
      expect(metadata.resourceType).toBe('device');
      expect(metadata.severity).toBe(AuditSeverity.MEDIUM);
    });

    it('AuditDeviceUpdate should configure device update audit with id param', () => {
      const metadata = getMetadata(AuditDeviceUpdate('deviceId'));
      
      expect(metadata.action).toBe(AuditAction.DEVICE_UPDATE);
      expect(metadata.resourceIdParam).toBe('deviceId');
    });

    it('AuditDeviceDelete should configure high severity', () => {
      const metadata = getMetadata(AuditDeviceDelete());
      
      expect(metadata.action).toBe(AuditAction.DEVICE_DELETE);
      expect(metadata.severity).toBe(AuditSeverity.HIGH);
    });
  });

  describe('Fleet Management Decorators', () => {
    it('AuditFleetCreate should configure fleet creation audit', () => {
      const metadata = getMetadata(AuditFleetCreate());
      
      expect(metadata.action).toBe(AuditAction.FLEET_CREATE);
      expect(metadata.resourceType).toBe('fleet');
    });

    it('AuditFleetUpdate should configure fleet update audit', () => {
      const metadata = getMetadata(AuditFleetUpdate('fleetId'));
      
      expect(metadata.action).toBe(AuditAction.FLEET_UPDATE);
      expect(metadata.resourceIdParam).toBe('fleetId');
    });

    it('AuditFleetDelete should configure high severity', () => {
      const metadata = getMetadata(AuditFleetDelete());
      
      expect(metadata.severity).toBe(AuditSeverity.HIGH);
    });
  });

  describe('Firmware Management Decorators', () => {
    it('AuditFirmwareUpload should not include request body', () => {
      const metadata = getMetadata(AuditFirmwareUpload());
      
      expect(metadata.action).toBe(AuditAction.FIRMWARE_UPLOAD);
      expect(metadata.includeRequestBody).toBe(false);
    });

    it('AuditFirmwareDelete should configure high severity', () => {
      const metadata = getMetadata(AuditFirmwareDelete('firmwareId'));
      
      expect(metadata.action).toBe(AuditAction.FIRMWARE_DELETE);
      expect(metadata.severity).toBe(AuditSeverity.HIGH);
    });
  });

  describe('Deployment Management Decorators', () => {
    it('AuditDeploymentCreate should configure deployment creation', () => {
      const metadata = getMetadata(AuditDeploymentCreate());
      
      expect(metadata.action).toBe(AuditAction.DEPLOYMENT_CREATE);
      expect(metadata.severity).toBe(AuditSeverity.HIGH);
    });

    it('AuditDeploymentStart should configure deployment start', () => {
      const metadata = getMetadata(AuditDeploymentStart());
      
      expect(metadata.action).toBe(AuditAction.DEPLOYMENT_START);
    });

    it('AuditDeploymentCancel should configure deployment cancel', () => {
      const metadata = getMetadata(AuditDeploymentCancel());
      
      expect(metadata.action).toBe(AuditAction.DEPLOYMENT_CANCEL);
    });

    it('AuditDeploymentRollback should configure critical severity', () => {
      const metadata = getMetadata(AuditDeploymentRollback());
      
      expect(metadata.action).toBe(AuditAction.DEPLOYMENT_ROLLBACK);
      expect(metadata.severity).toBe(AuditSeverity.CRITICAL);
    });
  });
});

