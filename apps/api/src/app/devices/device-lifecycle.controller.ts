/**
 * Device Lifecycle Controller - REST endpoints for lifecycle management
 */

import { Controller, Post, Get, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { DeviceLifecycleService, TransitionResult } from './device-lifecycle.service';
import {
  TransitionDeviceDto,
  BatchTransitionDto,
  TransitionResultDto,
  AllowedTransitionsDto,
  LifecycleHistoryEntryDto,
  BatchTransitionResultDto,
  LifecycleStatsDto,
} from './dto/lifecycle.dto';

interface AuthenticatedRequest {
  user?: { sub: string; email: string };
}

@ApiTags('Device Lifecycle')
@ApiBearerAuth()
@Controller('devices')
export class DeviceLifecycleController {
  constructor(private readonly lifecycleService: DeviceLifecycleService) {}

  @Post(':id/lifecycle/transition')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Transition device to a new status' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionDeviceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.transition(
      id,
      dto.status,
      dto.reason,
      req.user?.email,
    );
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/activate')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Activate a registered device' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async activate(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.activate(id, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/suspend')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Suspend a device' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async suspend(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.suspend(id, dto.reason, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/reactivate')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Reactivate a suspended device' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async reactivate(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.reactivate(id, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/maintenance/start')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Put device in maintenance mode' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async startMaintenance(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.startMaintenance(id, dto.reason, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/maintenance/end')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'End device maintenance mode' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async endMaintenance(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.endMaintenance(id, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Post(':id/lifecycle/decommission')
  @Permissions(Permission.DEVICE_DELETE)
  @ApiOperation({ summary: 'Decommission a device permanently' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  async decommission(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<TransitionResultDto> {
    const result = await this.lifecycleService.decommission(id, dto.reason, req.user?.email);
    return this.toTransitionResultDto(result);
  }

  @Get(':id/lifecycle/allowed-transitions')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get allowed transitions for a device' })
  @ApiResponse({ status: 200, type: AllowedTransitionsDto })
  async getAllowedTransitions(@Param('id') id: string): Promise<AllowedTransitionsDto> {
    const device = await this.lifecycleService['deviceRepository'].findById(id);
    const allowed = await this.lifecycleService.getAllowedTransitions(id);
    return {
      deviceId: id,
      currentStatus: device!.status,
      allowedTransitions: allowed,
    };
  }

  @Get(':id/lifecycle/history')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get device lifecycle history' })
  @ApiResponse({ status: 200, type: [LifecycleHistoryEntryDto] })
  async getHistory(@Param('id') id: string): Promise<LifecycleHistoryEntryDto[]> {
    return this.lifecycleService.getLifecycleHistory(id);
  }

  @Post('lifecycle/batch')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Batch transition multiple devices' })
  @ApiResponse({ status: 200, type: BatchTransitionResultDto })
  async batchTransition(
    @Body() dto: BatchTransitionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BatchTransitionResultDto> {
    const result = await this.lifecycleService.batchTransition(
      dto.deviceIds,
      dto.status,
      dto.reason,
      req.user?.email,
    );
    return {
      success: result.success.map((r) => this.toTransitionResultDto(r)),
      failed: result.failed,
    };
  }

  @Get('lifecycle/stats/:fleetId')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get lifecycle statistics for a fleet' })
  @ApiResponse({ status: 200, type: LifecycleStatsDto })
  async getFleetStats(@Param('fleetId') fleetId: string): Promise<LifecycleStatsDto> {
    return this.lifecycleService.getFleetLifecycleStats(fleetId);
  }

  private toTransitionResultDto(result: TransitionResult): TransitionResultDto {
    return {
      deviceId: result.device.id,
      event: result.event,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      timestamp: result.timestamp,
    };
  }
}
