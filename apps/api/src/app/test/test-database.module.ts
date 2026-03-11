/**
 * Test Database Module
 * Uses MongoDB Memory Server for integration/E2E tests
 */

import { Module, DynamicModule, Global, OnModuleDestroy } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

@Global()
@Module({})
export class TestDatabaseModule implements OnModuleDestroy {
  static async forRoot(): Promise<DynamicModule> {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    return {
      module: TestDatabaseModule,
      imports: [MongooseModule.forRoot(uri)],
      exports: [MongooseModule],
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  }
}

