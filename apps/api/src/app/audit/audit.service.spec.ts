/**
 * Audit Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditAction, AuditSeverity } from './audit.types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('AuditService', () => {
  let service: AuditService;
  let mockCollection: any;
  let mockConnection: any;
  let mockWinston: any;

  beforeEach(async () => {
    mockCollection = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'audit-123' }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    mockConnection = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockWinston = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockWinston,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    const baseEntry = {
      action: AuditAction.DEVICE_CREATE,
      severity: AuditSeverity.MEDIUM,
      userId: 'user-123',
      userType: 'user' as const,
      resourceType: 'device',
      resourceId: 'dev-456',
      method: 'POST',
      path: '/api/devices',
      success: true,
    };

    it('should persist audit log to MongoDB', async () => {
      await service.log(baseEntry);

      expect(mockConnection.collection).toHaveBeenCalledWith('audit_logs');
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DEVICE_CREATE,
          userId: 'user-123',
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should log to Winston', async () => {
      await service.log(baseEntry);

      expect(mockWinston.log).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('[AUDIT]'),
        expect.objectContaining({ audit: expect.any(Object) }),
      );
    });

    it('should sanitize sensitive data in request body', async () => {
      await service.log({
        ...baseEntry,
        requestBody: {
          name: 'Test Device',
          password: 'secret123',
          apiKey: 'key-abc',
          config: {
            token: 'bearer-xyz',
          },
        },
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            name: 'Test Device',
            password: '[REDACTED]',
            apiKey: '[REDACTED]',
            config: {
              token: '[REDACTED]',
            },
          },
        }),
      );
    });

    it('should use error level for CRITICAL severity', async () => {
      await service.log({
        ...baseEntry,
        severity: AuditSeverity.CRITICAL,
      });

      expect(mockWinston.log).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should use warn level for HIGH severity', async () => {
      await service.log({
        ...baseEntry,
        severity: AuditSeverity.HIGH,
      });

      expect(mockWinston.log).toHaveBeenCalledWith(
        'warn',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should handle MongoDB errors gracefully', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(service.log(baseEntry)).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    it('should query with filters', async () => {
      await service.query({
        userId: 'user-123',
        action: AuditAction.LOGIN,
        limit: 50,
      });

      expect(mockCollection.find).toHaveBeenCalledWith({
        userId: 'user-123',
        action: AuditAction.LOGIN,
      });
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.query({ startDate, endDate });

      expect(mockCollection.find).toHaveBeenCalledWith({
        timestamp: { $gte: startDate, $lte: endDate },
      });
    });
  });

  describe('getResourceHistory', () => {
    it('should query by resource type and id', async () => {
      await service.getResourceHistory('device', 'dev-123', 25);

      expect(mockCollection.find).toHaveBeenCalledWith({
        resourceType: 'device',
        resourceId: 'dev-123',
      });
    });
  });

  describe('getUserActivity', () => {
    it('should query by user id', async () => {
      await service.getUserActivity('user-456', 50);

      expect(mockCollection.find).toHaveBeenCalledWith({
        userId: 'user-456',
      });
    });
  });
});

