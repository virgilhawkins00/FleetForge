/**
 * Deployment Scheduling DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ScheduleType {
  ONCE = 'ONCE', // One-time scheduled deployment
  RECURRING = 'RECURRING', // Recurring deployment (cron-based)
  MAINTENANCE_WINDOW = 'MAINTENANCE_WINDOW', // Within specific time windows
}

export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM', // Custom cron expression
}

export class MaintenanceWindowDto {
  @ApiProperty({ example: '02:00', description: 'Start time (HH:mm)' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '06:00', description: 'End time (HH:mm)' })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    description: 'Days of week',
  })
  @IsOptional()
  @IsString({ each: true })
  daysOfWeek?: string[];

  @ApiPropertyOptional({ example: 'America/Sao_Paulo', description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class ScheduleDeploymentDto {
  @ApiProperty({ enum: ScheduleType, example: ScheduleType.ONCE })
  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @ApiPropertyOptional({
    example: '2026-03-15T02:00:00Z',
    description: 'Scheduled start time (for ONCE type)',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ enum: RecurrencePattern })
  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern;

  @ApiPropertyOptional({
    example: '0 2 * * *',
    description: 'Cron expression (for CUSTOM recurrence)',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ type: MaintenanceWindowDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaintenanceWindowDto)
  maintenanceWindow?: MaintenanceWindowDto;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59Z',
    description: 'End date for recurring schedules',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Max number of occurrences',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  maxOccurrences?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Skip if deployment is already in progress',
  })
  @IsOptional()
  @IsBoolean()
  skipIfInProgress?: boolean;
}

export class ScheduledDeploymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  deploymentId!: string;

  @ApiProperty({ enum: ScheduleType })
  type!: ScheduleType;

  @ApiPropertyOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional()
  cronExpression?: string;

  @ApiPropertyOptional()
  nextRunAt?: Date;

  @ApiPropertyOptional()
  lastRunAt?: Date;

  @ApiProperty()
  runCount!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronExpression?: string;
}
