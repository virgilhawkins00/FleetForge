/**
 * Shadows Module
 * Device Shadow (Digital Twin) management
 */

import { Module } from '@nestjs/common';
import { ShadowsController } from './shadows.controller';
import { ShadowsService } from './shadows.service';

@Module({
  controllers: [ShadowsController],
  providers: [ShadowsService],
  exports: [ShadowsService],
})
export class ShadowsModule {}

