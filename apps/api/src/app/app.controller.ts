import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@fleetforge/security';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): { status: string; timestamp: string; version: string } {
    return this.appService.getHealth();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getInfo(): {
    name: string;
    version: string;
    description: string;
    documentation: string;
  } {
    return this.appService.getInfo();
  }
}
