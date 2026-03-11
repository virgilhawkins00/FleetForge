/**
 * Deployment Scheduler Service
 * Manages scheduled and recurring firmware deployments
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DeploymentRepository } from '@fleetforge/database';
import { DeploymentStatus } from '@fleetforge/core';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import {
  ScheduleDeploymentDto,
  ScheduleType,
  RecurrencePattern,
  ScheduledDeploymentResponseDto,
  UpdateScheduleDto,
} from './dto';
import { v4 as uuidv4 } from 'uuid';

interface ScheduledJob {
  id: string;
  deploymentId: string;
  type: ScheduleType;
  scheduledAt?: Date;
  cronExpression?: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  maxOccurrences?: number;
  isActive: boolean;
  createdAt: Date;
  skipIfInProgress: boolean;
}

@Injectable()
export class DeploymentSchedulerService {
  private readonly logger = new Logger(DeploymentSchedulerService.name);
  private readonly scheduledJobs = new Map<string, ScheduledJob>();

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly deploymentRepo: DeploymentRepository,
    private readonly orchestrator: DeploymentOrchestratorService,
  ) {}

  /**
   * Schedule a deployment
   */
  async scheduleDeployment(
    deploymentId: string,
    dto: ScheduleDeploymentDto,
  ): Promise<ScheduledDeploymentResponseDto> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) {
      throw new NotFoundException(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== DeploymentStatus.PENDING) {
      throw new BadRequestException(`Cannot schedule deployment with status: ${deployment.status}`);
    }

    const scheduleId = uuidv4();
    const job: ScheduledJob = {
      id: scheduleId,
      deploymentId,
      type: dto.type,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      cronExpression: dto.cronExpression,
      runCount: 0,
      maxOccurrences: dto.maxOccurrences,
      isActive: true,
      createdAt: new Date(),
      skipIfInProgress: dto.skipIfInProgress ?? true,
    };

    // Create the appropriate job type
    switch (dto.type) {
      case ScheduleType.ONCE:
        this.scheduleOnce(job);
        break;
      case ScheduleType.RECURRING:
        this.scheduleRecurring(job, dto.recurrencePattern);
        break;
      case ScheduleType.MAINTENANCE_WINDOW:
        this.scheduleMaintenanceWindow(job, dto);
        break;
    }

    this.scheduledJobs.set(scheduleId, job);
    this.logger.log(`Scheduled deployment ${deploymentId} with ID ${scheduleId}`);

    return this.toResponse(job);
  }

  /**
   * Get all scheduled jobs for a deployment
   */
  getSchedulesForDeployment(deploymentId: string): ScheduledDeploymentResponseDto[] {
    return Array.from(this.scheduledJobs.values())
      .filter((job) => job.deploymentId === deploymentId)
      .map((job) => this.toResponse(job));
  }

  /**
   * Get a specific schedule
   */
  getSchedule(scheduleId: string): ScheduledDeploymentResponseDto {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }
    return this.toResponse(job);
  }

  /**
   * Update a schedule
   */
  updateSchedule(scheduleId: string, dto: UpdateScheduleDto): ScheduledDeploymentResponseDto {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    if (dto.isActive !== undefined) {
      job.isActive = dto.isActive;
      if (!dto.isActive) {
        this.cancelCronJob(scheduleId);
      }
    }

    if (dto.scheduledAt) {
      job.scheduledAt = new Date(dto.scheduledAt);
      this.rescheduleOnce(job);
    }

    if (dto.cronExpression) {
      job.cronExpression = dto.cronExpression;
      this.rescheduleCron(job);
    }

    return this.toResponse(job);
  }

  /**
   * Cancel a scheduled deployment
   */
  cancelSchedule(scheduleId: string): void {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    this.cancelCronJob(scheduleId);
    this.scheduledJobs.delete(scheduleId);
    this.logger.log(`Cancelled schedule ${scheduleId}`);
  }

  /**
   * Get all active schedules
   */
  getAllActiveSchedules(): ScheduledDeploymentResponseDto[] {
    return Array.from(this.scheduledJobs.values())
      .filter((job) => job.isActive)
      .map((job) => this.toResponse(job));
  }

  // ==================== Private Methods ====================

  private scheduleOnce(job: ScheduledJob): void {
    if (!job.scheduledAt) {
      throw new BadRequestException('scheduledAt is required for ONCE type');
    }

    const delay = job.scheduledAt.getTime() - Date.now();
    if (delay < 0) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    job.nextRunAt = job.scheduledAt;

    const timeout = setTimeout(() => {
      this.executeScheduledDeployment(job);
    }, delay);

    this.schedulerRegistry.addTimeout(`deployment_${job.id}`, timeout);
  }

  private scheduleRecurring(job: ScheduledJob, pattern?: RecurrencePattern): void {
    let cronExpr = job.cronExpression;

    if (!cronExpr && pattern) {
      cronExpr = this.patternToCron(pattern);
      job.cronExpression = cronExpr;
    }

    if (!cronExpr) {
      throw new BadRequestException('cronExpression or recurrencePattern is required');
    }

    const cronJob = new CronJob(cronExpr, () => {
      this.executeScheduledDeployment(job);
    });

    this.schedulerRegistry.addCronJob(`deployment_${job.id}`, cronJob);
    cronJob.start();

    job.nextRunAt = cronJob.nextDate().toJSDate();
  }

  private scheduleMaintenanceWindow(job: ScheduledJob, dto: ScheduleDeploymentDto): void {
    if (!dto.maintenanceWindow) {
      throw new BadRequestException('maintenanceWindow is required');
    }

    const { startTime, daysOfWeek } = dto.maintenanceWindow;
    const [hours, minutes] = startTime.split(':').map(Number);

    // Build cron: minutes hours * * daysOfWeek
    const daysCron = daysOfWeek?.length ? daysOfWeek.map((d) => this.dayToCron(d)).join(',') : '*';

    const cronExpr = `${minutes} ${hours} * * ${daysCron}`;
    job.cronExpression = cronExpr;

    this.scheduleRecurring(job);
  }

  private async executeScheduledDeployment(job: ScheduledJob): Promise<void> {
    if (!job.isActive) return;

    // Check max occurrences
    if (job.maxOccurrences && job.runCount >= job.maxOccurrences) {
      this.logger.log(`Schedule ${job.id} reached max occurrences`);
      job.isActive = false;
      this.cancelCronJob(job.id);
      return;
    }

    try {
      const deployment = await this.deploymentRepo.findById(job.deploymentId);
      if (!deployment) {
        this.logger.warn(`Deployment ${job.deploymentId} not found, cancelling schedule`);
        this.cancelSchedule(job.id);
        return;
      }

      // Skip if already in progress
      if (job.skipIfInProgress && deployment.status === DeploymentStatus.IN_PROGRESS) {
        this.logger.log(`Skipping scheduled deployment ${job.deploymentId} - already in progress`);
        return;
      }

      // Only start if pending
      if (deployment.status === DeploymentStatus.PENDING) {
        await this.orchestrator.createDeploymentPlan(job.deploymentId);
        await this.orchestrator.startDeployment(job.deploymentId);
        this.logger.log(`Executed scheduled deployment ${job.deploymentId}`);
      }

      job.runCount++;
      job.lastRunAt = new Date();

      // Update next run for recurring
      if (job.type === ScheduleType.RECURRING || job.type === ScheduleType.MAINTENANCE_WINDOW) {
        const cronJob = this.schedulerRegistry.getCronJob(`deployment_${job.id}`);
        if (cronJob) {
          job.nextRunAt = cronJob.nextDate().toJSDate();
        }
      } else {
        // One-time job complete
        job.isActive = false;
      }
    } catch (error) {
      this.logger.error(`Failed to execute scheduled deployment: ${(error as Error).message}`);
    }
  }

  private cancelCronJob(scheduleId: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(`deployment_${scheduleId}`);
    } catch {
      // Cron job might not exist
    }
    try {
      this.schedulerRegistry.deleteTimeout(`deployment_${scheduleId}`);
    } catch {
      // Timeout might not exist
    }
  }

  private rescheduleOnce(job: ScheduledJob): void {
    this.cancelCronJob(job.id);
    this.scheduleOnce(job);
  }

  private rescheduleCron(job: ScheduledJob): void {
    this.cancelCronJob(job.id);
    this.scheduleRecurring(job);
  }

  private patternToCron(pattern: RecurrencePattern): string {
    switch (pattern) {
      case RecurrencePattern.DAILY:
        return '0 2 * * *'; // 2 AM daily
      case RecurrencePattern.WEEKLY:
        return '0 2 * * 0'; // 2 AM Sunday
      case RecurrencePattern.MONTHLY:
        return '0 2 1 * *'; // 2 AM first day of month
      default:
        throw new BadRequestException(`Unknown recurrence pattern: ${pattern}`);
    }
  }

  private dayToCron(day: string): string {
    const days: Record<string, string> = {
      SUN: '0',
      MON: '1',
      TUE: '2',
      WED: '3',
      THU: '4',
      FRI: '5',
      SAT: '6',
    };
    return days[day.toUpperCase()] ?? '*';
  }

  private toResponse(job: ScheduledJob): ScheduledDeploymentResponseDto {
    return {
      id: job.id,
      deploymentId: job.deploymentId,
      type: job.type,
      scheduledAt: job.scheduledAt,
      cronExpression: job.cronExpression,
      nextRunAt: job.nextRunAt,
      lastRunAt: job.lastRunAt,
      runCount: job.runCount,
      isActive: job.isActive,
      createdAt: job.createdAt,
    };
  }
}
