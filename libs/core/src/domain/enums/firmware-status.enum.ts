/**
 * Firmware Status Enumeration
 * Represents the lifecycle states of firmware packages
 */

export enum FirmwareStatus {
  /** Firmware is being uploaded */
  UPLOADING = 'UPLOADING',

  /** Firmware is being validated */
  VALIDATING = 'VALIDATING',

  /** Firmware is ready for deployment */
  READY = 'READY',

  /** Firmware is being deployed */
  DEPLOYING = 'DEPLOYING',

  /** Firmware deployment is complete */
  DEPLOYED = 'DEPLOYED',

  /** Firmware deployment failed */
  FAILED = 'FAILED',

  /** Firmware has been rolled back */
  ROLLED_BACK = 'ROLLED_BACK',

  /** Firmware is deprecated */
  DEPRECATED = 'DEPRECATED',
}

export enum FirmwareType {
  /** Full firmware image */
  FULL = 'FULL',

  /** Delta/differential update */
  DELTA = 'DELTA',

  /** Patch update */
  PATCH = 'PATCH',
}

