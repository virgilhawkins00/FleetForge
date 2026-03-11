import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@fleetforge/database';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { DeploymentSchedulerService } from './deployment-scheduler.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), forwardRef(() => EventsModule)],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentOrchestratorService, DeploymentSchedulerService],
  exports: [DeploymentsService, DeploymentOrchestratorService, DeploymentSchedulerService],
})
export class DeploymentsModule {}
