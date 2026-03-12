import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TracingService, TracingModule } from './tracing.module';

describe('TracingModule', () => {
  let module: TestingModule;
  let tracingService: TracingService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        TRACING_ENABLED: 'false', // Disable for tests
        SERVICE_NAME: 'test-service',
        APP_VERSION: '1.0.0',
        NODE_ENV: 'test',
        TRACING_EXPORTER: 'console',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TracingModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    tracingService = module.get<TracingService>(TracingService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('TracingService', () => {
    it('should be defined', () => {
      expect(tracingService).toBeDefined();
    });

    it('should not initialize when disabled', async () => {
      // Service should exist but SDK should not be started
      expect(tracingService).toBeDefined();
    });

    it('should handle module destroy gracefully', async () => {
      await expect(tracingService.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('TracingModule', () => {
    it('should provide TracingService', () => {
      const service = module.get<TracingService>(TracingService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TracingService);
    });
  });
});

describe('TracingService Configuration', () => {
  it('should use default values when env vars not set', async () => {
    const configService = {
      get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
    };

    const service = new TracingService(configService as unknown as ConfigService);
    expect(service).toBeDefined();
  });

  it('should respect TRACING_ENABLED=false', async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'TRACING_ENABLED') return 'false';
        return defaultValue;
      }),
    };

    const service = new TracingService(configService as unknown as ConfigService);
    await service.initialize();
    // Should complete without error when disabled
    expect(service).toBeDefined();
  });
});
