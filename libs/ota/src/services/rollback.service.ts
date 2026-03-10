/**
 * Rollback Service
 * Handles automatic and manual rollbacks
 */

import { IRollbackConfig, IDeviceUpdateStatus, RollbackReason } from '../types';

export interface IRollbackHistory {
  deviceId: string;
  deploymentId: string;
  fromVersion: string;
  toVersion: string;
  reason: RollbackReason;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export class RollbackService {
  private rollbackHistory: IRollbackHistory[] = [];
  private deviceBackups = new Map<string, Buffer>();

  /**
   * Execute rollback for a device
   */
  async rollbackDevice(
    deviceId: string,
    status: IDeviceUpdateStatus,
    config: IRollbackConfig,
    reason: RollbackReason,
  ): Promise<boolean> {
    let retries = 0;
    let success = false;

    while (retries < config.maxRetries && !success) {
      try {
        // Restore previous firmware
        success = await this.restorePreviousFirmware(
          deviceId,
          status.currentVersion,
          config.preserveUserData,
        );

        if (success) {
          this.recordRollback(deviceId, status, reason, true);

          if (config.notifyOnRollback) {
            await this.notifyRollback(deviceId, status, reason);
          }
        } else {
          // Increment retries even when restore fails without exception
          retries++;
          if (retries < config.maxRetries) {
            await this.sleep(config.retryDelay);
          }
        }
      } catch (error) {
        console.error(`Rollback attempt ${retries + 1} failed for device ${deviceId}:`, error);
        retries++;

        if (retries < config.maxRetries) {
          await this.sleep(config.retryDelay);
        }
      }
    }

    if (!success) {
      this.recordRollback(deviceId, status, reason, false, 'Max retries exceeded');
    }

    return success;
  }

  /**
   * Rollback multiple devices
   */
  async rollbackDevices(
    deviceStatuses: IDeviceUpdateStatus[],
    config: IRollbackConfig,
    reason: RollbackReason,
  ): Promise<{ success: number; failed: number }> {
    const results = await Promise.all(
      deviceStatuses.map((status) => this.rollbackDevice(status.deviceId, status, config, reason)),
    );

    const success = results.filter((r) => r).length;
    const failed = results.length - success;

    return { success, failed };
  }

  /**
   * Create backup before update
   */
  async createBackup(deviceId: string, firmwareData: Buffer): Promise<void> {
    this.deviceBackups.set(deviceId, firmwareData);
  }

  /**
   * Restore previous firmware
   */
  private async restorePreviousFirmware(
    deviceId: string,
    _previousVersion: string,
    _preserveUserData: boolean,
  ): Promise<boolean> {
    const backup = this.deviceBackups.get(deviceId);

    if (!backup) {
      console.error(`No backup found for device ${deviceId}`);
      return false;
    }

    // Simulate firmware restoration (short delay for testing)
    await this.sleep(10);

    // In production, this would:
    // 1. Download previous firmware version
    // 2. Verify signature
    // 3. Flash firmware
    // 4. Preserve user data if configured
    // 5. Reboot device

    return Math.random() > 0.05; // 95% success rate
  }

  /**
   * Record rollback in history
   */
  private recordRollback(
    deviceId: string,
    status: IDeviceUpdateStatus,
    reason: RollbackReason,
    success: boolean,
    error?: string,
  ): void {
    this.rollbackHistory.push({
      deviceId,
      deploymentId: status.deploymentId,
      fromVersion: status.targetVersion,
      toVersion: status.currentVersion,
      reason,
      timestamp: new Date(),
      success,
      error,
    });
  }

  /**
   * Notify about rollback
   */
  private async notifyRollback(
    deviceId: string,
    _status: IDeviceUpdateStatus,
    reason: RollbackReason,
  ): Promise<void> {
    // In production, this would send notifications via:
    // - Email
    // - SMS
    // - Webhook
    // - Push notification
    console.log(`Rollback notification: Device ${deviceId} rolled back due to ${reason}`);
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(deviceId?: string): IRollbackHistory[] {
    if (deviceId) {
      return this.rollbackHistory.filter((r) => r.deviceId === deviceId);
    }
    return this.rollbackHistory;
  }

  /**
   * Get rollback statistics
   */
  getRollbackStats(): {
    total: number;
    successful: number;
    failed: number;
    byReason: Record<RollbackReason, number>;
  } {
    const total = this.rollbackHistory.length;
    const successful = this.rollbackHistory.filter((r) => r.success).length;
    const failed = total - successful;

    const byReason: Record<RollbackReason, number> = {
      [RollbackReason.VERIFICATION_FAILED]: 0,
      [RollbackReason.INSTALLATION_FAILED]: 0,
      [RollbackReason.HEALTH_CHECK_FAILED]: 0,
      [RollbackReason.MANUAL]: 0,
      [RollbackReason.TIMEOUT]: 0,
    };

    this.rollbackHistory.forEach((r) => {
      byReason[r.reason]++;
    });

    return { total, successful, failed, byReason };
  }

  /**
   * Clear old rollback history
   */
  clearHistory(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.rollbackHistory = this.rollbackHistory.filter((r) => r.timestamp > cutoffDate);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
