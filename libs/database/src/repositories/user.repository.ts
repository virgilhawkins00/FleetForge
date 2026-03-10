/**
 * User Repository - MongoDB persistence for User authentication
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from '../schemas/user.schema';
import { User, UserMapper, UserPersistence } from '../mappers/user.mapper';

export interface CreateUserData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  organizationId?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
  organizationId?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  refreshToken?: string;
  passwordHash?: string;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: CreateUserData): Promise<User> {
    const doc = new this.userModel({
      _id: data.id,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      permissions: data.permissions || [],
      organizationId: data.organizationId,
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
    });

    const saved = await doc.save();
    return UserMapper.toDomain(saved.toObject() as UserPersistence);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id).lean().exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ refreshToken }).lean().exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    const docs = await this.userModel.find({ organizationId }).lean().exec();
    return UserMapper.toDomainArray(docs as UserPersistence[]);
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const doc = await this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.userModel
      .countDocuments({ email: email.toLowerCase() })
      .exec();
    return count > 0;
  }

  async incrementFailedAttempts(id: string): Promise<User | null> {
    const doc = await this.userModel
      .findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } }, { new: true })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }

  async resetFailedAttempts(id: string): Promise<User | null> {
    const doc = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { failedLoginAttempts: 0, lockoutUntil: null } },
        { new: true },
      )
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc as UserPersistence) : null;
  }
}

