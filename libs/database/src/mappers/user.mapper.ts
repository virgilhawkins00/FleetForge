/**
 * User Mapper - Converts between domain User and persistence UserModel
 */

import { UserRole, Permission } from '@fleetforge/core';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPersistence {
  _id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  /**
   * Convert persistence model to domain entity
   */
  static toDomain(persistence: UserPersistence): User {
    return {
      id: persistence._id,
      email: persistence.email,
      passwordHash: persistence.passwordHash,
      firstName: persistence.firstName,
      lastName: persistence.lastName,
      role: persistence.role,
      permissions: persistence.permissions || [],
      organizationId: persistence.organizationId,
      isActive: persistence.isActive,
      isEmailVerified: persistence.isEmailVerified,
      emailVerificationToken: persistence.emailVerificationToken,
      passwordResetToken: persistence.passwordResetToken,
      passwordResetExpires: persistence.passwordResetExpires,
      lastLoginAt: persistence.lastLoginAt,
      failedLoginAttempts: persistence.failedLoginAttempts || 0,
      lockoutUntil: persistence.lockoutUntil,
      refreshToken: persistence.refreshToken,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
    };
  }

  /**
   * Convert domain entity to persistence model
   */
  static toPersistence(domain: User): UserPersistence {
    return {
      _id: domain.id,
      email: domain.email,
      passwordHash: domain.passwordHash,
      firstName: domain.firstName,
      lastName: domain.lastName,
      role: domain.role,
      permissions: domain.permissions,
      organizationId: domain.organizationId,
      isActive: domain.isActive,
      isEmailVerified: domain.isEmailVerified,
      emailVerificationToken: domain.emailVerificationToken,
      passwordResetToken: domain.passwordResetToken,
      passwordResetExpires: domain.passwordResetExpires,
      lastLoginAt: domain.lastLoginAt,
      failedLoginAttempts: domain.failedLoginAttempts,
      lockoutUntil: domain.lockoutUntil,
      refreshToken: domain.refreshToken,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Convert array of persistence models to domain entities
   */
  static toDomainArray(persistenceArray: UserPersistence[]): User[] {
    return persistenceArray.map((p) => this.toDomain(p));
  }
}
