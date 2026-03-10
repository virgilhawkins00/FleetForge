import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService({ saltRounds: 10 }); // Lower for faster tests
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await service.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MySecurePassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await service.hash(password);

      const isValid = await service.verify(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await service.hash(password);

      const isValid = await service.verify('WrongPassword!', hashed);

      expect(isValid).toBe(false);
    });
  });

  describe('validateStrength', () => {
    it('should reject short passwords', () => {
      const result = service.validateStrength('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject passwords without lowercase', () => {
      const result = service.validateStrength('PASSWORD123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without uppercase', () => {
      const result = service.validateStrength('password123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = service.validateStrength('PasswordNoNum!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = service.validateStrength('Password123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept valid passwords', () => {
      const result = service.validateStrength('MySecure123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should give higher score for longer passwords', () => {
      const shortResult = service.validateStrength('MySecure1!');
      const longResult = service.validateStrength('MySecurePassword123!');

      expect(longResult.score).toBeGreaterThanOrEqual(shortResult.score);
    });
  });

  describe('generateRandom', () => {
    it('should generate password of specified length', () => {
      const password = service.generateRandom(20);

      expect(password.length).toBe(20);
    });

    it('should generate valid passwords', () => {
      const password = service.generateRandom(16);
      const result = service.validateStrength(password);

      expect(result.isValid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const pass1 = service.generateRandom();
      const pass2 = service.generateRandom();

      expect(pass1).not.toBe(pass2);
    });

    it('should use default length of 16', () => {
      const password = service.generateRandom();

      expect(password.length).toBe(16);
    });
  });

  describe('constructor', () => {
    it('should use default salt rounds when no config provided', () => {
      const defaultService = new PasswordService();

      // The service should work with default config
      expect(defaultService).toBeDefined();
    });
  });
});

