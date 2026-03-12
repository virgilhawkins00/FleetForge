import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions, Permission } from '@fleetforge/security';
import { FirmwareStatus } from '@fleetforge/core';
import { FirmwareService } from './firmware.service';
import { CreateFirmwareDto } from './dto/create-firmware.dto';
import { UpdateFirmwareDto } from './dto/update-firmware.dto';
import { FirmwareResponseDto } from './dto/firmware-response.dto';
import {
  UploadFirmwareDto,
  FirmwareUploadResponseDto,
  ValidateFirmwareDto,
  FirmwareValidationResponseDto,
} from './dto/upload-firmware.dto';
import { firmwareMulterOptions } from './config/multer.config';

@ApiTags('firmware')
@ApiBearerAuth()
@Controller({ path: 'firmware', version: '1' })
export class FirmwareController {
  constructor(private readonly firmwareService: FirmwareService) {}

  @Post()
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Upload new firmware' })
  @ApiResponse({ status: 201, description: 'Firmware created', type: FirmwareResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createFirmwareDto: CreateFirmwareDto): Promise<FirmwareResponseDto> {
    return this.firmwareService.create(createFirmwareDto);
  }

  @Get()
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get all firmware packages' })
  @ApiQuery({ name: 'status', required: false, enum: FirmwareStatus })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of firmware', type: [FirmwareResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('status') status?: FirmwareStatus,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<FirmwareResponseDto[]> {
    return this.firmwareService.findAll({ status, createdBy }, limit, offset);
  }

  @Get('version/:version')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get firmware by version' })
  @ApiResponse({ status: 200, description: 'Firmware found', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async findByVersion(@Param('version') version: string): Promise<FirmwareResponseDto> {
    return this.firmwareService.findByVersion(version);
  }

  @Get('compatible/:deviceType')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get compatible firmware for device type' })
  @ApiResponse({
    status: 200,
    description: 'Compatible firmware list',
    type: [FirmwareResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findCompatible(@Param('deviceType') deviceType: string): Promise<FirmwareResponseDto[]> {
    return this.firmwareService.findCompatible(deviceType);
  }

  @Get(':id')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get firmware by ID' })
  @ApiResponse({ status: 200, description: 'Firmware found', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async findOne(@Param('id') id: string): Promise<FirmwareResponseDto> {
    return this.firmwareService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Update firmware metadata' })
  @ApiResponse({ status: 200, description: 'Firmware updated', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFirmwareDto: UpdateFirmwareDto,
  ): Promise<FirmwareResponseDto> {
    return this.firmwareService.update(id, updateFirmwareDto);
  }

  @Patch(':id/status')
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Update firmware status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: FirmwareResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FirmwareStatus,
  ): Promise<FirmwareResponseDto> {
    return this.firmwareService.updateStatus(id, status);
  }

  @Delete(':id')
  @Permissions(Permission.FIRMWARE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete firmware' })
  @ApiResponse({ status: 204, description: 'Firmware deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.firmwareService.remove(id);
  }

  // ==========================================
  // File Upload & Download Endpoints
  // ==========================================

  @Post('upload')
  @Permissions(Permission.FIRMWARE_WRITE)
  @UseInterceptors(FileInterceptor('file', firmwareMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload firmware binary file with metadata' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'version', 'name', 'type', 'deviceTypes'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Firmware binary file' },
        version: { type: 'string', example: '2.5.0' },
        name: { type: 'string', example: 'Fleet Tracker Firmware' },
        type: { type: 'string', enum: ['FULL', 'DELTA', 'BOOTLOADER', 'RECOVERY'] },
        deviceTypes: { type: 'string', example: 'TRACKER,TELEMATICS' },
        minHardwareVersion: { type: 'string', example: '1.0.0' },
        maxHardwareVersion: { type: 'string', example: '3.0.0' },
        releaseNotes: { type: 'string' },
        skipValidation: { type: 'boolean', default: false },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Firmware uploaded', type: FirmwareUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or metadata' })
  async uploadFirmware(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFirmwareDto,
  ): Promise<FirmwareUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Firmware file is required');
    }
    return this.firmwareService.uploadFirmware(file, uploadDto);
  }

  @Post('validate')
  @Permissions(Permission.FIRMWARE_READ)
  @UseInterceptors(FileInterceptor('file', firmwareMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Validate firmware file without uploading' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        expectedChecksum: { type: 'string' },
        signature: { type: 'string' },
        publicKey: { type: 'string' },
        signatureAlgorithm: { type: 'string', example: 'RSA-SHA256' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: FirmwareValidationResponseDto,
  })
  async validateFirmware(
    @UploadedFile() file: Express.Multer.File,
    @Body() validateDto: ValidateFirmwareDto,
  ): Promise<FirmwareValidationResponseDto> {
    if (!file) {
      throw new BadRequestException('Firmware file is required');
    }
    return this.firmwareService.validateFirmwareFile(file, validateDto);
  }

  @Get('download/*key')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Download firmware binary file' })
  @ApiResponse({ status: 200, description: 'Firmware file stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFirmware(
    @Param('key') key: string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const keyPath = Array.isArray(key) ? key.join('/') : key;
    const { buffer, filename, contentType } = await this.firmwareService.downloadFirmware(keyPath);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post(':id/revalidate')
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Re-validate existing firmware and update status' })
  @ApiResponse({
    status: 200,
    description: 'Revalidation result',
    type: FirmwareValidationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async revalidateFirmware(@Param('id') id: string): Promise<FirmwareValidationResponseDto> {
    return this.firmwareService.revalidateFirmware(id);
  }
}
