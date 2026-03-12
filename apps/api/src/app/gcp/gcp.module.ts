import {
  Module,
  Global,
  DynamicModule,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  GCPModule as GCPLib,
  PubSubService,
  StorageService,
  BigQueryService,
} from '@fleetforge/gcp-integration';

export interface GCPModuleOptions {
  projectId: string;
  credentials?: string;
  region?: string;
  enabled?: boolean;
}

@Global()
@Module({})
export class GCPModule implements OnModuleInit, OnModuleDestroy {
  private static gcpLib: GCPLib | null = null;
  private static enabled = false;
  private readonly logger = new Logger(GCPModule.name);

  static forRoot(options: GCPModuleOptions): DynamicModule {
    this.enabled = options.enabled !== false;

    if (!this.enabled) {
      return {
        module: GCPModule,
        providers: [
          { provide: 'GCP_ENABLED', useValue: false },
          { provide: PubSubService, useValue: null },
          { provide: StorageService, useValue: null },
          { provide: BigQueryService, useValue: null },
        ],
        exports: ['GCP_ENABLED', PubSubService, StorageService, BigQueryService],
      };
    }

    this.gcpLib = new GCPLib(options);

    return {
      module: GCPModule,
      providers: [
        { provide: 'GCP_ENABLED', useValue: true },
        { provide: 'GCP_OPTIONS', useValue: options },
        { provide: PubSubService, useValue: this.gcpLib.pubsub },
        { provide: StorageService, useValue: this.gcpLib.storage },
        { provide: BigQueryService, useValue: this.gcpLib.bigquery },
      ],
      exports: ['GCP_ENABLED', PubSubService, StorageService, BigQueryService],
    };
  }

  static forRootAsync(options: {
    inject?: any[];
    useFactory: (...args: any[]) => GCPModuleOptions | Promise<GCPModuleOptions>;
  }): DynamicModule {
    return {
      module: GCPModule,
      providers: [
        {
          provide: 'GCP_OPTIONS',
          inject: options.inject || [],
          useFactory: options.useFactory,
        },
        {
          provide: 'GCP_ENABLED',
          inject: ['GCP_OPTIONS'],
          useFactory: (opts: GCPModuleOptions) => opts.enabled !== false,
        },
        {
          provide: 'GCP_LIB',
          inject: ['GCP_OPTIONS'],
          useFactory: async (opts: GCPModuleOptions) => {
            if (opts.enabled === false) return null;
            const lib = new GCPLib(opts);
            GCPModule.gcpLib = lib;
            GCPModule.enabled = true;
            return lib;
          },
        },
        {
          provide: PubSubService,
          inject: ['GCP_LIB'],
          useFactory: (lib: GCPLib | null) => lib?.pubsub || null,
        },
        {
          provide: StorageService,
          inject: ['GCP_LIB'],
          useFactory: (lib: GCPLib | null) => lib?.storage || null,
        },
        {
          provide: BigQueryService,
          inject: ['GCP_LIB'],
          useFactory: (lib: GCPLib | null) => lib?.bigquery || null,
        },
      ],
      exports: ['GCP_ENABLED', PubSubService, StorageService, BigQueryService],
    };
  }

  async onModuleInit() {
    if (GCPModule.enabled && GCPModule.gcpLib) {
      try {
        await GCPModule.gcpLib.initialize();
        this.logger.log('GCP services initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize GCP services', error);
      }
    } else {
      this.logger.log('GCP integration disabled');
    }
  }

  async onModuleDestroy() {
    if (GCPModule.gcpLib) {
      await GCPModule.gcpLib.close();
      this.logger.log('GCP services closed');
    }
  }
}
