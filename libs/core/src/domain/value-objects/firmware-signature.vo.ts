/**
 * Firmware Signature Value Object
 * Represents cryptographic signature for firmware validation
 */

export interface IFirmwareSignatureData {
  algorithm: string;
  signature: string;
  publicKey: string;
  timestamp: Date;
}

export interface IFirmwareSignature extends IFirmwareSignatureData {
  isExpired(): boolean;
  toJSON(): IFirmwareSignatureData;
}

export class FirmwareSignature implements IFirmwareSignature {
  constructor(
    public readonly algorithm: string,
    public readonly signature: string,
    public readonly publicKey: string,
    public readonly timestamp: Date = new Date(),
  ) {
    this.validate();
  }

  private validate(): void {
    const supportedAlgorithms = ['RSA-SHA256', 'ECDSA-SHA256', 'Ed25519'];

    if (!supportedAlgorithms.includes(this.algorithm)) {
      throw new Error(
        `Unsupported algorithm: ${this.algorithm}. Supported: ${supportedAlgorithms.join(', ')}`,
      );
    }

    if (!this.signature || this.signature.length === 0) {
      throw new Error('Signature cannot be empty');
    }

    if (!this.publicKey || this.publicKey.length === 0) {
      throw new Error('Public key cannot be empty');
    }
  }

  /**
   * Check if signature is expired (older than 30 days)
   */
  isExpired(): boolean {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.timestamp < thirtyDaysAgo;
  }

  /**
   * Value object equality
   */
  equals(other: IFirmwareSignature): boolean {
    return (
      this.algorithm === other.algorithm &&
      this.signature === other.signature &&
      this.publicKey === other.publicKey
    );
  }

  toJSON(): IFirmwareSignatureData {
    return {
      algorithm: this.algorithm,
      signature: this.signature,
      publicKey: this.publicKey,
      timestamp: this.timestamp,
    };
  }
}

