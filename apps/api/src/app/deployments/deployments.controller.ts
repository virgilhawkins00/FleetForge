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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeploymentStatus, IDeploymentProgress } from '@fleetforge/core';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { DeploymentResponseDto } from './dto/deployment-response.dto';

@ApiTags('deployments')
@Controller({ path: 'deployments', version: '1' })
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createDeploymentDto: CreateDeploymentDto): Promise<DeploymentResponseDto> {
    return this.deploymentsService.create(createDeploymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deployments' })
  @ApiQuery({ name: 'status', required: false, enum: DeploymentStatus })
  @ApiQuery({ name: 'firmwareId', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of deployments', type: [DeploymentResponseDto] })
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
  @ApiOperation({ summary: 'Get active deployments' })
  @ApiResponse({ status: 200, description: 'Active deployments', type: [DeploymentResponseDto] })
  async findActive(): Promise<DeploymentResponseDto[]> {
    return this.deploymentsService.findActive();
  }

  @Get('firmware/:firmwareId')
  @ApiOperation({ summary: 'Get deployments by firmware' })
  @ApiResponse({ status: 200, description: 'Deployments list', type: [DeploymentResponseDto] })
  async findByFirmware(@Param('firmwareId') firmwareId: string): Promise<DeploymentResponseDto[]> {
    return this.deploymentsService.findByFirmware(firmwareId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID' })
  @ApiResponse({ status: 200, description: 'Deployment found', type: DeploymentResponseDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async findOne(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.findOne(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start deployment' })
  @ApiResponse({ status: 200, description: 'Deployment started', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async start(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.start(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel deployment' })
  @ApiResponse({ status: 200, description: 'Deployment cancelled', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async cancel(@Param('id') id: string): Promise<DeploymentResponseDto> {
    return this.deploymentsService.cancel(id);
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Rollback deployment' })
  @ApiResponse({ status: 200, description: 'Deployment rolled back', type: DeploymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async rollback(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<DeploymentResponseDto> {
    return this.deploymentsService.rollback(id, reason);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update deployment progress' })
  @ApiResponse({ status: 200, description: 'Progress updated', type: DeploymentResponseDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async updateProgress(
    @Param('id') id: string,
    @Body() progress: IDeploymentProgress,
  ): Promise<DeploymentResponseDto> {
    return this.deploymentsService.updateProgress(id, progress);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deployment' })
  @ApiResponse({ status: 204, description: 'Deployment deleted' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.deploymentsService.remove(id);
  }
}

