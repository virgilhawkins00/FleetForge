/**
 * Encryption Service
 * Provides encryption/decryption utilities
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  pbkdf2,
  CipherGCM,
  DecipherGCM,
} from 'crypto';
import { promisify } from 'util';
import { IEncryptionOptions } from '../types';

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);

export interface IEncryptedData {
  encrypted: string;
  iv: string;
  authTag?: string;
  salt: string;
}

export class EncryptionService {
  private readonly defaultOptions: IEncryptionOptions = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'scrypt',
    iterations: 100000,
  };

  /**
   * Encrypt data
   */
  async encrypt(
    data: string,
    password: string,
    options?: Partial<IEncryptionOptions>,
  ): Promise<IEncryptedData> {
    const opts = { ...this.defaultOptions, ...options };

    // Generate salt and IV
    const salt = randomBytes(32);
    const iv = randomBytes(16);

    // Derive key from password
    const key = await this.deriveKey(password, salt, opts);

    // Create cipher
    const cipher = createCipheriv(opts.algorithm, key as Buffer, iv);

    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag for GCM mode
    const authTag =
      opts.algorithm === 'aes-256-gcm' ? (cipher as CipherGCM).getAuthTag() : undefined;

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag?.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(
    encryptedData: IEncryptedData,
    password: string,
    options?: Partial<IEncryptionOptions>,
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    // Derive key from password
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = await this.deriveKey(password, salt, opts);

    // Create decipher
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = createDecipheriv(opts.algorithm, key as Buffer, iv);

    // Set auth tag for GCM mode
    if (opts.algorithm === 'aes-256-gcm' && encryptedData.authTag) {
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      (decipher as DecipherGCM).setAuthTag(authTag);
    }

    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Derive encryption key from password
   */
  private async deriveKey(
    password: string,
    salt: Buffer,
    options: IEncryptionOptions,
  ): Promise<Buffer> {
    if (options.keyDerivation === 'scrypt') {
      return (await scryptAsync(password, salt, 32)) as Buffer;
    } else {
      return (await pbkdf2Async(
        password,
        salt,
        options.iterations || 100000,
        32,
        'sha256',
      )) as Buffer;
    }
  }

  /**
   * Generate random key
   */
  generateKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate random IV
   */
  generateIV(length: number = 16): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash password (for storage)
   */
  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(32);
    const hash = await pbkdf2Async(password, salt, 100000, 64, 'sha512');

    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const hashBuffer = await pbkdf2Async(password, saltBuffer, 100000, 64, 'sha512');

    return hashBuffer.toString('hex') === hash;
  }
}
