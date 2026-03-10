import { Test, TestingModule } from '@nestjs/testing';
import { SecurityModule, SECURITY_OPTIONS } from './security.module';
import { JwtService } from './services/jwt.service';
import { PasswordService } from './services/password.service';
import { EncryptionService } from './services/encryption.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

describe('SecurityModule', () => {
  let module: TestingModule;

  const jwtConfig = {
    secret: 'test-secret-key-for-jwt-tokens',
    accessTokenExpiration: '15m',
    refreshTokenExpiration: '7d',
    issuer: 'fleetforge',
    audience: 'fleetforge-api',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        SecurityModule.forRoot({
          jwt: jwtConfig,
          password: { saltRounds: 10 },
          enableGlobalGuards: false,
          enableRateLimiting: false,
          enableLogging: false,
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('Services', () => {
    it('should provide JwtService', () => {
      const jwtService = module.get<JwtService>(JwtService);
      expect(jwtService).toBeDefined();
    });

    it('should provide PasswordService', () => {
      const passwordService = module.get<PasswordService>(PasswordService);
      expect(passwordService).toBeDefined();
    });

    it('should provide EncryptionService', () => {
      const encryptionService = module.get<EncryptionService>(EncryptionService);
      expect(encryptionService).toBeDefined();
    });
  });

  describe('Guards', () => {
    it('should provide JwtAuthGuard', () => {
      const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      expect(guard).toBeDefined();
    });

    it('should provide RolesGuard', () => {
      const guard = module.get<RolesGuard>(RolesGuard);
      expect(guard).toBeDefined();
    });

    it('should provide PermissionsGuard', () => {
      const guard = module.get<PermissionsGuard>(PermissionsGuard);
      expect(guard).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should provide security options', () => {
      const options = module.get(SECURITY_OPTIONS);
      expect(options).toBeDefined();
      expect(options.jwt).toEqual(jwtConfig);
    });
  });

  describe('JwtService integration', () => {
    it('should generate and verify tokens', async () => {
      const jwtService = module.get<JwtService>(JwtService);

      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN' as any,
        permissions: [],
        type: 'user' as const,
      };

      const tokenPair = await jwtService.generateTokenPair(payload);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBeGreaterThan(0);

      const decoded = await jwtService.verifyToken(tokenPair.accessToken);
      expect(decoded.sub).toBe(payload.sub);
    });
  });

  describe('PasswordService integration', () => {
    it('should hash and verify passwords', async () => {
      const passwordService = module.get<PasswordService>(PasswordService);

      const password = 'SecurePassword123!';
      const hashed = await passwordService.hash(password);

      expect(await passwordService.verify(password, hashed)).toBe(true);
      expect(await passwordService.verify('WrongPassword', hashed)).toBe(false);
    });
  });
});

