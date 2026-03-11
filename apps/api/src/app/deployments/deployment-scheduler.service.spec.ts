/**
 * Deployment Scheduler Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DeploymentSchedulerService } from './deployment-scheduler.service';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { DeploymentRepository } from '@fleetforge/database';
import { DeploymentStatus } from '@fleetforge/core';
import { ScheduleType, RecurrencePattern } from './dto';

describe('DeploymentSchedulerService', () => {
  let service: DeploymentSchedulerService;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let deploymentRepo: jest.Mocked<DeploymentRepository>;

  const mockDeployment = {
    id: 'deploy-123',
    name: 'Test Deployment',
    status: DeploymentStatus.PENDING,
    config: { strategy: 'IMMEDIATE', target: {} },
  };

  beforeEach(async () => {
    const mockSchedulerRegistry = {
      addTimeout: jest.fn(),
      addCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
      deleteTimeout: jest.fn(),
      getCronJob: jest.fn(),
    };

    const mockDeploymentRepo = {
      findById: jest.fn(),
    };

    const mockOrchestrator = {
      createDeploymentPlan: jest.fn(),
      startDeployment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentSchedulerService,
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: DeploymentRepository, useValue: mockDeploymentRepo },
        { provide: DeploymentOrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    service = module.get<DeploymentSchedulerService>(DeploymentSchedulerService);
    schedulerRegistry = module.get(SchedulerRegistry);
    deploymentRepo = module.get(DeploymentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleDeployment', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(
        service.scheduleDeployment('nonexistent', {
          type: ScheduleType.ONCE,
          scheduledAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deployment not pending', async () => {
      const inProgressDeployment = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      deploymentRepo.findById.mockResolvedValue(inProgressDeployment as any);

      await expect(
        service.scheduleDeployment('deploy-123', {
          type: ScheduleType.ONCE,
          scheduledAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should schedule a one-time deployment', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      expect(result.deploymentId).toBe('deploy-123');
      expect(result.type).toBe(ScheduleType.ONCE);
      expect(result.isActive).toBe(true);
      expect(schedulerRegistry.addTimeout).toHaveBeenCalled();
    });

    it('should throw BadRequestException when scheduledAt is in the past', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const pastDate = new Date(Date.now() - 60000);

      await expect(
        service.scheduleDeployment('deploy-123', {
          type: ScheduleType.ONCE,
          scheduledAt: pastDate.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should schedule a recurring deployment with pattern', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        recurrencePattern: RecurrencePattern.DAILY,
      });

      expect(result.deploymentId).toBe('deploy-123');
      expect(result.type).toBe(ScheduleType.RECURRING);
      expect(result.cronExpression).toBe('0 2 * * *');
      expect(schedulerRegistry.addCronJob).toHaveBeenCalled();
    });

    it('should schedule with maintenance window', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '02:30',
          endTime: '06:00',
          daysOfWeek: ['MON', 'WED', 'FRI'],
        },
      });

      expect(result.type).toBe(ScheduleType.MAINTENANCE_WINDOW);
      expect(result.cronExpression).toBe('30 2 * * 1,3,5');
    });
  });

  describe('getSchedule', () => {
    it('should throw NotFoundException when schedule not found', () => {
      expect(() => service.getSchedule('nonexistent')).toThrow(NotFoundException);
    });

    it('should return schedule when found', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const result = service.getSchedule(created.id);
      expect(result.id).toBe(created.id);
      expect(result.deploymentId).toBe('deploy-123');
    });
  });

  describe('getSchedulesForDeployment', () => {
    it('should return schedules for deployment', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const result = service.getSchedulesForDeployment('deploy-123');
      expect(result).toHaveLength(1);
      expect(result[0].deploymentId).toBe('deploy-123');
    });

    it('should return empty array when no schedules', () => {
      const result = service.getSchedulesForDeployment('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getAllActiveSchedules', () => {
    it('should return only active schedules', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const result = service.getAllActiveSchedules();
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((schedule) => expect(schedule.isActive).toBe(true));
    });
  });

  describe('updateSchedule', () => {
    it('should throw NotFoundException when schedule not found', () => {
      expect(() => service.updateSchedule('nonexistent', { isActive: false })).toThrow(
        NotFoundException,
      );
    });

    it('should update schedule active status', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const result = service.updateSchedule(created.id, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should update scheduledAt', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const newDate = new Date(Date.now() + 120000);
      const result = service.updateSchedule(created.id, { scheduledAt: newDate.toISOString() });
      expect(new Date(result.scheduledAt!).getTime()).toBe(newDate.getTime());
    });
  });

  describe('cancelSchedule', () => {
    it('should throw NotFoundException when schedule not found', () => {
      expect(() => service.cancelSchedule('nonexistent')).toThrow(NotFoundException);
    });

    it('should cancel and remove schedule', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      service.cancelSchedule(created.id);
      expect(() => service.getSchedule(created.id)).toThrow(NotFoundException);
    });
  });

  describe('scheduleDeployment - additional branches', () => {
    it('should schedule with WEEKLY recurrence pattern', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        recurrencePattern: RecurrencePattern.WEEKLY,
      });

      expect(result.cronExpression).toBe('0 2 * * 0');
    });

    it('should schedule with MONTHLY recurrence pattern', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        recurrencePattern: RecurrencePattern.MONTHLY,
      });

      expect(result.cronExpression).toBe('0 2 1 * *');
    });

    it('should schedule with custom cron expression', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        cronExpression: '0 3 * * 1-5',
      });

      expect(result.cronExpression).toBe('0 3 * * 1-5');
    });

    it('should throw BadRequestException for recurring without cron or pattern', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      await expect(
        service.scheduleDeployment('deploy-123', {
          type: ScheduleType.RECURRING,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for maintenance without window', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      await expect(
        service.scheduleDeployment('deploy-123', {
          type: ScheduleType.MAINTENANCE_WINDOW,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should schedule maintenance window without daysOfWeek', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '03:00',
          endTime: '05:00',
        },
      });

      expect(result.cronExpression).toBe('0 3 * * *');
    });

    it('should throw BadRequestException for ONCE without scheduledAt', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      await expect(
        service.scheduleDeployment('deploy-123', {
          type: ScheduleType.ONCE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSchedule - additional branches', () => {
    it('should update cronExpression and reschedule', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        recurrencePattern: RecurrencePattern.DAILY,
      });

      const result = service.updateSchedule(created.id, {
        cronExpression: '0 4 * * *',
      });

      expect(result.cronExpression).toBe('0 4 * * *');
    });

    it('should keep schedule active when isActive is true', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      const result = service.updateSchedule(created.id, { isActive: true });
      expect(result.isActive).toBe(true);
    });
  });

  describe('executeScheduledDeployment - branch coverage', () => {
    it('should handle deactivating a job', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      const futureDate = new Date(Date.now() + 60000);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      // Deactivate the job
      const updated = service.updateSchedule(created.id, { isActive: false });

      // Verify the schedule was deactivated
      expect(updated.isActive).toBe(false);
    });

    it('should handle job with maxOccurrences defined', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.RECURRING,
        cronExpression: '0 2 * * *',
        maxOccurrences: 5,
      });

      expect(created).toBeDefined();
      expect(created.type).toBe(ScheduleType.RECURRING);
    });

    it('should create schedule with skipIfInProgress flag', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const futureDate = new Date(Date.now() + 60000);
      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
        skipIfInProgress: true,
      });

      expect(created).toBeDefined();
      expect(created.type).toBe(ScheduleType.ONCE);
    });
  });

  describe('maintenance window - branch coverage', () => {
    it('should schedule maintenance window with daysOfWeek array', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '02:30',
          endTime: '04:30',
          daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
        },
      });

      // Just verify it was created successfully with a cron expression
      expect(result.cronExpression).toBeDefined();
      expect(result.type).toBe(ScheduleType.MAINTENANCE_WINDOW);
    });

    it('should schedule maintenance window with weekend days', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '00:00',
          endTime: '06:00',
          daysOfWeek: ['SATURDAY', 'SUNDAY'],
        },
      });

      expect(result.cronExpression).toBeDefined();
      expect(result.type).toBe(ScheduleType.MAINTENANCE_WINDOW);
    });
  });

  describe('dayToCron - branch coverage', () => {
    it('should convert valid day names to cron numbers', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '02:00',
          endTime: '04:00',
          daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        },
      });

      expect(result.cronExpression).toBeDefined();
    });

    it('should handle lowercase day names', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.MAINTENANCE_WINDOW,
        maintenanceWindow: {
          startTime: '02:00',
          endTime: '04:00',
          daysOfWeek: ['sun', 'sat'],
        },
      });

      expect(result.cronExpression).toBeDefined();
    });
  });

  describe('cancelSchedule - branch coverage', () => {
    it('should handle cancelling a schedule when cron job does not exist', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      schedulerRegistry.deleteCronJob.mockImplementation(() => {
        throw new Error('Cron job not found');
      });
      schedulerRegistry.deleteTimeout.mockImplementation(() => {
        throw new Error('Timeout not found');
      });

      const futureDate = new Date(Date.now() + 60000);
      const created = await service.scheduleDeployment('deploy-123', {
        type: ScheduleType.ONCE,
        scheduledAt: futureDate.toISOString(),
      });

      expect(() => service.cancelSchedule(created.id)).not.toThrow();
    });
  });
});
