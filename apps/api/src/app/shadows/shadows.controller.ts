/**
 * Shadows Controller
 * REST API for Device Shadow (Digital Twin) operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { ShadowsService } from './shadows.service';
import { ShadowResponseDto, UpdateReportedStateDto, UpdateDesiredStateDto } from './dto';

@ApiTags('shadows')
@ApiBearerAuth()
@Controller('shadows')
export class ShadowsController {
  constructor(private readonly shadowsService: ShadowsService) {}

  @Get(':deviceId')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get device shadow' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, type: ShadowResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getShadow(@Param('deviceId') deviceId: string): Promise<ShadowResponseDto> {
    return this.shadowsService.getShadow(deviceId);
  }

  @Put(':deviceId/reported')
  @Permissions(Permission.TELEMETRY_WRITE)
  @ApiOperation({ summary: 'Update reported state (from device)' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, type: ShadowResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateReported(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateReportedStateDto,
  ): Promise<ShadowResponseDto> {
    return this.shadowsService.updateReported(deviceId, dto);
  }

  @Put(':deviceId/desired')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Update desired state (from cloud)' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, type: ShadowResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateDesired(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDesiredStateDto,
  ): Promise<ShadowResponseDto> {
    return this.shadowsService.updateDesired(deviceId, dto);
  }

  @Get(':deviceId/delta')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get delta between desired and reported state' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Delta object' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDelta(@Param('deviceId') deviceId: string): Promise<Record<string, unknown>> {
    return this.shadowsService.getDelta(deviceId);
  }

  @Post(':deviceId/sync')
  @Permissions(Permission.TELEMETRY_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark shadow as synced (device acknowledged)' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, type: ShadowResponseDto })
  @ApiResponse({ status: 404, description: 'Shadow not found' })
  async markSynced(@Param('deviceId') deviceId: string): Promise<ShadowResponseDto> {
    return this.shadowsService.markSynced(deviceId);
  }

  @Delete(':deviceId')
  @Permissions(Permission.DEVICE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete device shadow' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 204, description: 'Shadow deleted' })
  async deleteShadow(@Param('deviceId') deviceId: string): Promise<void> {
    return this.shadowsService.deleteShadow(deviceId);
  }

  @Get()
  @Permissions(Permission.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Get all shadows with pending deltas' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [ShadowResponseDto] })
  async getShadowsWithPendingDeltas(@Query('limit') limit?: number): Promise<ShadowResponseDto[]> {
    return this.shadowsService.getShadowsWithPendingDeltas(limit);
  }
}
