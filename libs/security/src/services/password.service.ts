/**
 * Password Service - bcrypt-based password hashing
 * Industry standard for secure password storage
 */

import { hash, compare, genSalt } from 'bcrypt';

export interface IPasswordServiceConfig {
  saltRounds?: number;
}

export class PasswordService {
  private readonly saltRounds: number;

  constructor(config?: IPasswordServiceConfig) {
    this.saltRounds = config?.saltRounds ?? 12;
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password (includes salt)
   */
  async hash(password: string): Promise<string> {
    const salt = await genSalt(this.saltRounds);
    return hash(password, salt);
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password
   * @param hashedPassword - Stored hash
   * @returns True if password matches
   */
  async verify(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
  }

  /**
   * Check if a password meets minimum requirements
   * @param password - Password to validate
   * @returns Validation result with errors
   */
  validateStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (password.length >= 12) {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 5), // Max score of 5
    };
  }

  /**
   * Generate a random password
   * @param length - Password length (default: 16)
   * @returns Random password meeting all requirements
   */
  generateRandom(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = lowercase + uppercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}
