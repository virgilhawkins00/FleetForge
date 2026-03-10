/**
 * FleetForge API - Main Entry Point
 * Enterprise IoT Fleet Management Platform
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('FleetForge API')
    .setDescription('Enterprise IoT Fleet Management Platform API')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('devices', 'Device management endpoints')
    .addTag('firmware', 'Firmware management endpoints')
    .addTag('deployments', 'OTA deployment endpoints')
    .addTag('telemetry', 'Telemetry data endpoints')
    .addTag('fleets', 'Fleet management endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] || 3000;
  await app.listen(port);

  const nodeEnv = process.env['NODE_ENV'] || 'development';
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 FleetForge API Server                               ║
  ║                                                           ║
  ║   Environment: ${nodeEnv}                              ║
  ║   Port:        ${port}                                        ║
  ║   API Docs:    http://localhost:${port}/api/docs              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
