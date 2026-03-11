/**
 * DeviceDeployment Entity
 * Tracks individual device deployment status within a deployment campaign
 */

export enum DeviceDeploymentStatus {
  /** Waiting to be deployed */
  PENDING = 'PENDING',
  /** Device is downloading firmware */
  DOWNLOADING = 'DOWNLOADING',
  /** Download complete, ready to install */
  DOWNLOADED = 'DOWNLOADED',
  /** Device is installing firmware */
  INSTALLING = 'INSTALLING',
  /** Installation complete, rebooting */
  REBOOTING = 'REBOOTING',
  /** Deployment succeeded */
  SUCCEEDED = 'SUCCEEDED',
  /** Deployment failed */
  FAILED = 'FAILED',
  /** Device was rolled back */
  ROLLED_BACK = 'ROLLED_BACK',
  /** Deployment skipped (device offline, incompatible, etc.) */
  SKIPPED = 'SKIPPED',
}

export interface IDeviceDeploymentError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface IDeviceDeploymentMetrics {
  downloadStartedAt?: Date;
  downloadCompletedAt?: Date;
  installStartedAt?: Date;
  installCompletedAt?: Date;
  downloadDurationMs?: number;
  installDurationMs?: number;
  downloadRetries: number;
  installRetries: number;
}

export class DeviceDeployment {
  constructor(
    public readonly id: string,
    public readonly deploymentId: string,
    public readonly deviceId: string,
    public readonly firmwareId: string,
    public status: DeviceDeploymentStatus,
    public previousFirmwareVersion: string | null,
    public targetFirmwareVersion: string,
    public progress: number, // 0-100
    public metrics: IDeviceDeploymentMetrics,
    public errors: IDeviceDeploymentError[],
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public completedAt?: Date,
    public rollbackReason?: string,
  ) {}

  /**
   * Start download phase
   */
  startDownload(): void {
    if (this.status !== DeviceDeploymentStatus.PENDING) {
      throw new Error(`Cannot start download from status: ${this.status}`);
    }
    this.status = DeviceDeploymentStatus.DOWNLOADING;
    this.metrics.downloadStartedAt = new Date();
    this.progress = 5;
    this.updatedAt = new Date();
  }

  /**
   * Update download progress
   */
  updateDownloadProgress(percent: number): void {
    if (this.status !== DeviceDeploymentStatus.DOWNLOADING) return;
    this.progress = Math.min(45, 5 + (percent * 0.4)); // Download is 5-45%
    this.updatedAt = new Date();
  }

  /**
   * Complete download phase
   */
  completeDownload(): void {
    if (this.status !== DeviceDeploymentStatus.DOWNLOADING) {
      throw new Error(`Cannot complete download from status: ${this.status}`);
    }
    this.status = DeviceDeploymentStatus.DOWNLOADED;
    this.metrics.downloadCompletedAt = new Date();
    this.metrics.downloadDurationMs =
      this.metrics.downloadCompletedAt.getTime() -
      (this.metrics.downloadStartedAt?.getTime() ?? 0);
    this.progress = 45;
    this.updatedAt = new Date();
  }

  /**
   * Start installation phase
   */
  startInstall(): void {
    if (this.status !== DeviceDeploymentStatus.DOWNLOADED) {
      throw new Error(`Cannot start install from status: ${this.status}`);
    }
    this.status = DeviceDeploymentStatus.INSTALLING;
    this.metrics.installStartedAt = new Date();
    this.progress = 50;
    this.updatedAt = new Date();
  }

  /**
   * Update install progress
   */
  updateInstallProgress(percent: number): void {
    if (this.status !== DeviceDeploymentStatus.INSTALLING) return;
    this.progress = Math.min(90, 50 + (percent * 0.4)); // Install is 50-90%
    this.updatedAt = new Date();
  }

  /**
   * Mark as rebooting
   */
  markRebooting(): void {
    if (this.status !== DeviceDeploymentStatus.INSTALLING) {
      throw new Error(`Cannot mark rebooting from status: ${this.status}`);
    }
    this.status = DeviceDeploymentStatus.REBOOTING;
    this.metrics.installCompletedAt = new Date();
    this.metrics.installDurationMs =
      this.metrics.installCompletedAt.getTime() -
      (this.metrics.installStartedAt?.getTime() ?? 0);
    this.progress = 95;
    this.updatedAt = new Date();
  }

  /**
   * Mark deployment as succeeded
   */
  succeed(): void {
    this.status = DeviceDeploymentStatus.SUCCEEDED;
    this.progress = 100;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark deployment as failed
   */
  fail(error: IDeviceDeploymentError): void {
    this.status = DeviceDeploymentStatus.FAILED;
    this.errors.push(error);
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Rollback this device
   */
  rollback(reason: string): void {
    this.status = DeviceDeploymentStatus.ROLLED_BACK;
    this.rollbackReason = reason;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }
}

