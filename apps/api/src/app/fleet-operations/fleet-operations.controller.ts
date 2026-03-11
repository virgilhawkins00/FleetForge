/**
 * Fleet Operations Controller
 * REST API for batch operations across device fleets
 */

import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { FleetOperationsService } from './fleet-operations.service';
import {
  BatchUpdateDesiredStateDto,
  BatchTransitionDto,
  SendCommandDto,
  BatchTagsDto,
  BulkSyncDto,
  FleetSummaryDto,
} from './dto';

@ApiTags('fleet-operations')
@ApiBearerAuth()
@Controller('fleet-operations')
export class FleetOperationsController {
  constructor(private readonly fleetOpsService: FleetOperationsService) {}

  @Get(':fleetId/summary')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get fleet summary with device statistics' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  @ApiResponse({ status: 200, type: FleetSummaryDto })
  async getFleetSummary(@Param('fleetId') fleetId: string): Promise<FleetSummaryDto> {
    return this.fleetOpsService.getFleetSummary(fleetId);
  }

  @Post(':fleetId/shadows/batch-update')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Batch update desired state for fleet devices' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  @ApiResponse({ status: 200, description: 'Batch update result' })
  async batchUpdateDesiredState(
    @Param('fleetId') fleetId: string,
    @Body() dto: BatchUpdateDesiredStateDto,
  ) {
    return this.fleetOpsService.batchUpdateDesiredState(fleetId, dto.state, dto.filter);
  }

  @Post(':fleetId/batch-transition')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Batch transition devices to a new status' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  async batchTransition(
    @Param('fleetId') fleetId: string,
    @Body() dto: BatchTransitionDto,
    @Request() req: { user?: { sub?: string } },
  ) {
    const performedBy = req.user?.sub;
    return this.fleetOpsService.batchTransition(
      fleetId,
      dto.status,
      dto.reason,
      performedBy,
      dto.filter,
    );
  }

  @Post(':fleetId/send-command')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Send command to fleet devices via shadow' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  async sendCommand(@Param('fleetId') fleetId: string, @Body() dto: SendCommandDto) {
    return this.fleetOpsService.sendCommand(
      fleetId,
      { command: dto.command, parameters: dto.parameters, timeout: dto.timeout },
      dto.filter,
    );
  }

  @Post(':fleetId/tags/add')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Batch add tags to devices' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  async batchAddTags(@Param('fleetId') fleetId: string, @Body() dto: BatchTagsDto) {
    return this.fleetOpsService.batchAddTags(fleetId, dto.tags, dto.filter);
  }

  @Post(':fleetId/tags/remove')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Batch remove tags from devices' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  async batchRemoveTags(@Param('fleetId') fleetId: string, @Body() dto: BatchTagsDto) {
    return this.fleetOpsService.batchRemoveTags(fleetId, dto.tags, dto.filter);
  }

  @Get(':fleetId/pending-deltas')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get shadows with pending deltas for fleet' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  async getFleetPendingDeltas(@Param('fleetId') fleetId: string) {
    const shadows = await this.fleetOpsService.getFleetPendingDeltas(fleetId);
    return shadows.map((s) => s.toJSON());
  }

  @Post('bulk-sync')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Bulk mark shadows as synced' })
  async bulkMarkSynced(@Body() dto: BulkSyncDto) {
    return this.fleetOpsService.bulkMarkSynced(dto.deviceIds);
  }
}
