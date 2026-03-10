import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getInfo(): {
    name: string;
    version: string;
    description: string;
    documentation: string;
  } {
    return {
      name: 'FleetForge API',
      version: '1.0.0',
      description: 'Enterprise IoT Fleet Management Platform',
      documentation: '/api/docs',
    };
  }
}

