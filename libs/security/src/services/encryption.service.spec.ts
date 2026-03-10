/**
 * Encryption Service Tests
 */

import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const data = 'sensitive-data-123';
      const password = 'strong-password';

      const encrypted = await service.encrypt(data, password);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('authTag');

      const decrypted = await service.decrypt(encrypted, password);
      expect(decrypted).toBe(data);
    });

    it('should fail with wrong password', async () => {
      const data = 'sensitive-data-123';
      const password = 'strong-password';
      const wrongPassword = 'wrong-password';

      const encrypted = await service.encrypt(data, password);

      await expect(service.decrypt(encrypted, wrongPassword)).rejects.toThrow();
    });

    it('should encrypt different data differently', async () => {
      const data1 = 'data-1';
      const data2 = 'data-2';
      const password = 'password';

      const encrypted1 = await service.encrypt(data1, password);
      const encrypted2 = await service.encrypt(data2, password);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
    });

    it('should use different IVs for same data', async () => {
      const data = 'same-data';
      const password = 'password';

      const encrypted1 = await service.encrypt(data, password);
      const encrypted2 = await service.encrypt(data, password);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
    });
  });

  describe('encryption options', () => {
    it('should support AES-256-CBC', async () => {
      const data = 'test-data';
      const password = 'password';

      const encrypted = await service.encrypt(data, password, {
        algorithm: 'aes-256-cbc',
      });

      expect(encrypted.authTag).toBeUndefined();

      const decrypted = await service.decrypt(encrypted, password, {
        algorithm: 'aes-256-cbc',
      });

      expect(decrypted).toBe(data);
    });

    it('should support PBKDF2 key derivation', async () => {
      const data = 'test-data';
      const password = 'password';

      const encrypted = await service.encrypt(data, password, {
        keyDerivation: 'pbkdf2',
        iterations: 50000,
      });

      const decrypted = await service.decrypt(encrypted, password, {
        keyDerivation: 'pbkdf2',
        iterations: 50000,
      });

      expect(decrypted).toBe(data);
    });
  });

  describe('generateKey', () => {
    it('should generate random key', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();

      expect(key1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(key2).toHaveLength(64);
      expect(key1).not.toBe(key2);
    });

    it('should generate key of specified length', () => {
      const key = service.generateKey(16);
      expect(key).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });

  describe('generateIV', () => {
    it('should generate random IV', () => {
      const iv1 = service.generateIV();
      const iv2 = service.generateIV();

      expect(iv1).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(iv2).toHaveLength(32);
      expect(iv1).not.toBe(iv2);
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'my-password';
      const result = await service.hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result.hash).toHaveLength(128); // 64 bytes = 128 hex chars
      expect(result.salt).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate different hashes for same password', async () => {
      const password = 'my-password';
      const result1 = await service.hashPassword(password);
      const result2 = await service.hashPassword(password);

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'my-password';
      const { hash, salt } = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'my-password';
      const wrongPassword = 'wrong-password';
      const { hash, salt } = await service.hashPassword(password);

      const isValid = await service.verifyPassword(wrongPassword, hash, salt);
      expect(isValid).toBe(false);
    });
  });
});

