import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => EventsModule)],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentOrchestratorService],
  exports: [DeploymentsService, DeploymentOrchestratorService],
})
export class DeploymentsModule {}
