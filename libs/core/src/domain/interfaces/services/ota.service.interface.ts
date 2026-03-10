/**
 * OTA Service Interface (Port)
 * Defines contract for Over-The-Air update operations
 */

import { Deployment, Firmware } from '../../entities';
import { IDeploymentConfig } from '../../entities/deployment.entity';

export interface IOTAUpdateResult {
  deploymentId: string;
  targetDeviceCount: number;
  estimatedDuration: number; // in minutes
}

export interface IDeltaPackage {
  fromVersion: string;
  toVersion: string;
  size: number;
  url: string;
  checksum: string;
}

export interface IOTAService {
  /**
   * Create and initiate firmware deployment
   */
  deployFirmware(
    firmwareId: string,
    config: IDeploymentConfig,
    createdBy: string,
  ): Promise<IOTAUpdateResult>;

  /**
   * Generate delta update package
   */
  generateDeltaPackage(fromVersion: string, toVersion: string): Promise<IDeltaPackage>;

  /**
   * Validate firmware signature
   */
  validateFirmwareSignature(firmware: Firmware): Promise<boolean>;

  /**
   * Rollback deployment
   */
  rollbackDeployment(deploymentId: string, reason: string): Promise<void>;

  /**
   * Get deployment status
   */
  getDeploymentStatus(deploymentId: string): Promise<Deployment>;

  /**
   * Cancel ongoing deployment
   */
  cancelDeployment(deploymentId: string): Promise<void>;
}

