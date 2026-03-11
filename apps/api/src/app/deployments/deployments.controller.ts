import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { DeploymentStatus, IDeploymentProgress } from '@fleetforge/core';
import { DeploymentsService } from './deployments.service';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { DeploymentResponseDto } from './dto/deployment-response.dto';
import {
  DeviceDeploymentResponseDto,
  DeviceDeploymentStatsDto,
  UpdateDeviceProgressDto,
  RollbackDeploymentDto,
} from './dto/device-deployment.dto';

@ApiTags('deployments')
@ApiBearerAuth()
@Controller({ path: 'deployments', version: '1' })
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly orchestratorService: DeploymentOrchestratorService,
  ) {}

  @Post()
  @Permissions(Permission.DEPLOYMENT_CREATE)
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createDeploymentDto: CreateDeploymentDto): Promise<DeploymentResponseDto> {
    return this.deploymentsService.create(createDeploymentDto);
  }

  @Get()
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get all deployments' })
  @ApiQuery({ name: 'status', required: false, enum: DeploymentStatus })
  @ApiQuery({ name: 'firmwareId', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of deployments', type: [DeploymentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('status') status?: DeploymentStatus,
    @Query('firmwareId') firmwareId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<DeploymentResponseDto[]> {
    return this.deploymentsService.findAll({ status, firmwareId, createdBy }, limit, offset);
  }

  @Get('active')
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get active deployments' })
  @ApiResponse({ status: 200, description: 'Active deployments', type: [DeploymentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findActive(): Promise<DeploymentResponseDto[]> {
    return this.deploymentsService.findActive();
  }

  @Get('firmware/:firmwareId')
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get deployments by firmware' })
  @ApiResponse({ status: 200, description: 'Deployments list', type: [DeploymentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByFirmware(@Param('firmwareId') firmwareId: string): Promise<DeploymentResponseDto[]> {
    return this.deploymentsService.findByFirmware(firmwareId);
  }

  @Get(':id')
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get deployment by ID' })
  @ApiResponse({ status: 200, description: 'Deployment found', type: DeploymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async findOne(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.findOne(id);
  }

  @Post(':id/start')
  @Permissions(Permission.DEPLOYMENT_CREATE)
  @ApiOperation({ summary: 'Start deployment' })
  @ApiResponse({ status: 200, description: 'Deployment started', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async start(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.start(id);
  }

  @Post(':id/cancel')
  @Permissions(Permission.DEPLOYMENT_CANCEL)
  @ApiOperation({ summary: 'Cancel deployment' })
  @ApiResponse({ status: 200, description: 'Deployment cancelled', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async cancel(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.cancel(id);
  }

  @Post(':id/rollback')
  @Permissions(Permission.DEPLOYMENT_ROLLBACK)
  @ApiOperation({ summary: 'Rollback deployment' })
  @ApiResponse({ status: 200, description: 'Deployment rolled back', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async rollback(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<DeploymentResponseDto> {
    return this.deploymentsService.rollback(id, reason);
  }

  @Patch(':id/progress')
  @Permissions(Permission.DEPLOYMENT_CREATE)
  @ApiOperation({ summary: 'Update deployment progress' })
  @ApiResponse({ status: 200, description: 'Progress updated', type: DeploymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async updateProgress(
    @Param('id') id: string,
    @Body() progress: IDeploymentProgress,
  ): Promise<DeploymentResponseDto> {
    return this.deploymentsService.updateProgress(id, progress);
  }

  @Delete(':id')
  @Permissions(Permission.DEPLOYMENT_CANCEL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deployment' })
  @ApiResponse({ status: 204, description: 'Deployment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.deploymentsService.remove(id);
  }

  // ===================== Orchestrator Endpoints =====================

  @Post(':id/orchestrate')
  @Permissions(Permission.DEPLOYMENT_CREATE)
  @ApiOperation({ summary: 'Create deployment plan and initialize device deployments' })
  @ApiResponse({ status: 200, description: 'Deployment plan created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async createPlan(@Param('id') id: string) {
    return this.orchestratorService.createDeploymentPlan(id);
  }

  @Post(':id/execute')
  @Permissions(Permission.DEPLOYMENT_CREATE)
  @ApiOperation({ summary: 'Execute a prepared deployment' })
  @ApiResponse({ status: 200, description: 'Deployment started', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async execute(@Param('id') id: string): Promise<DeploymentResponseDto> {
    const deployment = await this.orchestratorService.startDeployment(id);
    return this.deploymentsService.mapToResponse(deployment);
  }

  @Post(':id/orchestrate-rollback')
  @Permissions(Permission.DEPLOYMENT_ROLLBACK)
  @ApiOperation({ summary: 'Rollback deployment with orchestration' })
  @ApiResponse({ status: 200, description: 'Deployment rolled back', type: DeploymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async orchestrateRollback(
    @Param('id') id: string,
    @Body() dto: RollbackDeploymentDto,
  ): Promise<DeploymentResponseDto> {
    const deployment = await this.orchestratorService.rollbackDeployment(id, dto.reason);
    return this.deploymentsService.mapToResponse(deployment);
  }

  @Patch(':id/devices/:deviceId/progress')
  @Permissions(Permission.TELEMETRY_WRITE)
  @ApiOperation({ summary: 'Update device deployment progress' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateDeviceProgress(
    @Param('id') deploymentId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceProgressDto,
  ): Promise<{ success: boolean }> {
    await this.orchestratorService.updateDeviceProgress(deploymentId, deviceId, dto);
    return { success: true };
  }

  @Get(':id/devices')
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get device deployments for a deployment' })
  @ApiResponse({
    status: 200,
    description: 'Device deployments list',
    type: [DeviceDeploymentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeviceDeployments(@Param('id') id: string): Promise<DeviceDeploymentResponseDto[]> {
    return this.deploymentsService.getDeviceDeployments(id);
  }

  @Get(':id/stats')
  @Permissions(Permission.DEPLOYMENT_READ)
  @ApiOperation({ summary: 'Get deployment statistics' })
  @ApiResponse({ status: 200, description: 'Deployment stats', type: DeviceDeploymentStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@Param('id') id: string): Promise<DeviceDeploymentStatsDto> {
    return this.deploymentsService.getDeploymentStats(id);
  }
}
