/**
 * Security Module - NestJS Dynamic Module
 * Provides JWT, Password hashing, Guards, and Interceptors
 */

import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { JwtService, IJwtServiceConfig } from './services/jwt.service';
import { PasswordService, IPasswordServiceConfig } from './services/password.service';
import { EncryptionService } from './services/encryption.service';
import { SignatureValidationService } from './services/signature-validation.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { MtlsGuard } from './guards/mtls.guard';
import { TenantGuard } from './guards/tenant.guard';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MtlsService } from './services/mtls.service';

export interface SecurityModuleOptions {
  jwt: IJwtServiceConfig;
  password?: IPasswordServiceConfig;
  enableGlobalGuards?: boolean;
  enableRateLimiting?: boolean;
  enableLogging?: boolean;
}

// Injection tokens
export const JWT_SERVICE_CONFIG = 'JWT_SERVICE_CONFIG';
export const PASSWORD_SERVICE_CONFIG = 'PASSWORD_SERVICE_CONFIG';
export const SECURITY_OPTIONS = 'SECURITY_OPTIONS';

@Global()
@Module({})
export class SecurityModule {
  /**
   * Configure the security module with options
   */
  static forRoot(options: SecurityModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Configuration providers
      {
        provide: SECURITY_OPTIONS,
        useValue: options,
      },
      {
        provide: JWT_SERVICE_CONFIG,
        useValue: options.jwt,
      },
      {
        provide: PASSWORD_SERVICE_CONFIG,
        useValue: options.password ?? { saltRounds: 12 },
      },

      // Services
      {
        provide: JwtService,
        useFactory: (config: IJwtServiceConfig) => new JwtService(config),
        inject: [JWT_SERVICE_CONFIG],
      },
      {
        provide: PasswordService,
        useFactory: (config: IPasswordServiceConfig) => new PasswordService(config),
        inject: [PASSWORD_SERVICE_CONFIG],
      },
      EncryptionService,
      SignatureValidationService,
      MtlsService,

      // Guards (for manual injection)
      {
        provide: JwtAuthGuard,
        useFactory: (jwtService: JwtService, reflector: Reflector) =>
          new JwtAuthGuard(jwtService, reflector),
        inject: [JwtService, Reflector],
      },
      RolesGuard,
      PermissionsGuard,
      {
        provide: MtlsGuard,
        useFactory: (reflector: Reflector, mtlsService: MtlsService) =>
          new MtlsGuard(reflector, mtlsService),
        inject: [Reflector, MtlsService],
      },
      TenantGuard,

      // Interceptors
      RateLimitInterceptor,
      LoggingInterceptor,
    ];

    // Add global guards if enabled
    if (options.enableGlobalGuards) {
      providers.push(
        {
          provide: APP_GUARD,
          useExisting: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useExisting: RolesGuard,
        },
        {
          provide: APP_GUARD,
          useExisting: PermissionsGuard,
        },
      );
    }

    // Add rate limiting interceptor globally if enabled
    if (options.enableRateLimiting) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useExisting: RateLimitInterceptor,
      });
    }

    // Add logging interceptor globally if enabled
    if (options.enableLogging) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useExisting: LoggingInterceptor,
      });
    }

    return {
      module: SecurityModule,
      providers,
      exports: [
        JwtService,
        PasswordService,
        EncryptionService,
        SignatureValidationService,
        MtlsService,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
        MtlsGuard,
        TenantGuard,
        RateLimitInterceptor,
        LoggingInterceptor,
        SECURITY_OPTIONS,
      ],
    };
  }

  /**
   * Configure the security module asynchronously (e.g., with ConfigService)
   */
  static forRootAsync(asyncOptions: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<SecurityModuleOptions> | SecurityModuleOptions;
  }): DynamicModule {
    const providers: Provider[] = [
      // Async configuration provider
      {
        provide: SECURITY_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject || [],
      },
      {
        provide: JWT_SERVICE_CONFIG,
        useFactory: (options: SecurityModuleOptions) => options.jwt,
        inject: [SECURITY_OPTIONS],
      },
      {
        provide: PASSWORD_SERVICE_CONFIG,
        useFactory: (options: SecurityModuleOptions) => options.password ?? { saltRounds: 12 },
        inject: [SECURITY_OPTIONS],
      },

      // Services
      {
        provide: JwtService,
        useFactory: (config: IJwtServiceConfig) => new JwtService(config),
        inject: [JWT_SERVICE_CONFIG],
      },
      {
        provide: PasswordService,
        useFactory: (config: IPasswordServiceConfig) => new PasswordService(config),
        inject: [PASSWORD_SERVICE_CONFIG],
      },
      EncryptionService,
      SignatureValidationService,
      MtlsService,

      // Guards (for manual injection)
      {
        provide: JwtAuthGuard,
        useFactory: (jwtService: JwtService, reflector: Reflector) =>
          new JwtAuthGuard(jwtService, reflector),
        inject: [JwtService, Reflector],
      },
      RolesGuard,
      PermissionsGuard,
      {
        provide: MtlsGuard,
        useFactory: (reflector: Reflector, mtlsService: MtlsService) =>
          new MtlsGuard(reflector, mtlsService),
        inject: [Reflector, MtlsService],
      },
      TenantGuard,

      // Interceptors
      RateLimitInterceptor,
      LoggingInterceptor,
    ];

    return {
      module: SecurityModule,
      imports: asyncOptions.imports || [],
      providers,
      exports: [
        JwtService,
        PasswordService,
        EncryptionService,
        SignatureValidationService,
        MtlsService,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
        MtlsGuard,
        TenantGuard,
        RateLimitInterceptor,
        LoggingInterceptor,
        SECURITY_OPTIONS,
      ],
    };
  }
}
