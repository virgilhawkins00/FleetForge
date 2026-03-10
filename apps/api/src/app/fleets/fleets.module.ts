import { Module } from '@nestjs/common';
import { DatabaseModule } from '@fleetforge/database';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FleetsController],
  providers: [FleetsService],
  exports: [FleetsService],
})
export class FleetsModule {}
