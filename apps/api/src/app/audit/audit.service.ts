/**
 * Audit Service
 * Handles audit log creation and querying
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuditLogEntry, AuditAction, AuditSeverity } from './audit.types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

const COLLECTION_NAME = 'audit_logs';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() @Inject(WINSTON_MODULE_PROVIDER) private readonly winston?: WinstonLogger,
  ) {}

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Sanitize sensitive data
    if (auditEntry.requestBody) {
      auditEntry.requestBody = this.sanitizeSensitiveData(auditEntry.requestBody);
    }

    try {
      // Persist to MongoDB
      const collection = this.connection.collection(COLLECTION_NAME);
      await collection.insertOne(auditEntry);

      // Also log to Winston for aggregation
      const logLevel = this.getLogLevel(entry.severity);
      const logMessage = this.formatLogMessage(auditEntry);

      if (this.winston) {
        this.winston.log(logLevel, logMessage, { audit: auditEntry });
      } else {
        this.logger.log(logMessage);
      }
    } catch (error) {
      // Don't throw - audit failures shouldn't break the application
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to persist audit log: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    severity?: AuditSeverity;
    limit?: number;
    skip?: number;
  }): Promise<AuditLogEntry[]> {
    const collection = this.connection.collection(COLLECTION_NAME);
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.success !== undefined) query.success = filters.success;
    if (filters.severity) query.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const results = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(filters.skip || 0)
      .limit(filters.limit || 100)
      .toArray();

    return results as unknown as AuditLogEntry[];
  }

  /**
   * Get audit summary for a resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit = 50,
  ): Promise<AuditLogEntry[]> {
    return this.query({ resourceType, resourceId, limit });
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, limit = 100): Promise<AuditLogEntry[]> {
    return this.query({ userId, limit });
  }

  private sanitizeSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'privateKey', 'credential'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    }

    return sanitized;
  }

  private getLogLevel(severity: AuditSeverity): string {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 'error';
      case AuditSeverity.HIGH:
        return 'warn';
      case AuditSeverity.MEDIUM:
        return 'info';
      default:
        return 'debug';
    }
  }

  private formatLogMessage(entry: AuditLogEntry): string {
    const status = entry.success ? 'SUCCESS' : 'FAILED';
    return `[AUDIT] ${entry.action} ${status} - User: ${entry.userId} - Resource: ${entry.resourceType}${entry.resourceId ? ':' + entry.resourceId : ''} - ${entry.method} ${entry.path}`;
  }
}
