/**
 * User Schema - MongoDB persistence model for User authentication
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, Permission } from '@fleetforge/security';

export type UserDocument = UserModel & Document;

@Schema({ collection: 'users', timestamps: true })
export class UserModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.VIEWER,
    index: true,
  })
  role!: UserRole;

  @Prop({ type: [String], enum: Object.values(Permission), default: [] })
  permissions!: Permission[];

  @Prop({ index: true })
  organizationId?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ default: 0 })
  failedLoginAttempts!: number;

  @Prop()
  lockoutUntil?: Date;

  @Prop()
  refreshToken?: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

// Indexes
UserSchema.index({ organizationId: 1, role: 1 });
UserSchema.index({ email: 1, isActive: 1 });
