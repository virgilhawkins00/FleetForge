import { UserMapper, User, UserPersistence } from './user.mapper';
import { UserRole, Permission } from '@fleetforge/security';

describe('UserMapper', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');

  const createMockPersistence = (overrides: Partial<UserPersistence> = {}): UserPersistence => ({
    _id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ADMIN,
    permissions: [Permission.DEVICE_READ, Permission.DEVICE_WRITE],
    organizationId: 'org-123',
    isActive: true,
    isEmailVerified: true,
    emailVerificationToken: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    lastLoginAt: mockDate,
    failedLoginAttempts: 0,
    lockoutUntil: undefined,
    refreshToken: 'refresh-token',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  const createMockDomain = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ADMIN,
    permissions: [Permission.DEVICE_READ, Permission.DEVICE_WRITE],
    organizationId: 'org-123',
    isActive: true,
    isEmailVerified: true,
    emailVerificationToken: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    lastLoginAt: mockDate,
    failedLoginAttempts: 0,
    lockoutUntil: undefined,
    refreshToken: 'refresh-token',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  describe('toDomain', () => {
    it('should convert persistence to domain', () => {
      const persistence = createMockPersistence();
      const result = UserMapper.toDomain(persistence);

      expect(result.id).toBe(persistence._id);
      expect(result.email).toBe(persistence.email);
      expect(result.passwordHash).toBe(persistence.passwordHash);
      expect(result.firstName).toBe(persistence.firstName);
      expect(result.lastName).toBe(persistence.lastName);
      expect(result.role).toBe(persistence.role);
      expect(result.permissions).toEqual(persistence.permissions);
      expect(result.organizationId).toBe(persistence.organizationId);
      expect(result.isActive).toBe(persistence.isActive);
    });

    it('should handle empty permissions', () => {
      const persistence = createMockPersistence({ permissions: undefined as any });
      const result = UserMapper.toDomain(persistence);
      expect(result.permissions).toEqual([]);
    });

    it('should handle zero failedLoginAttempts', () => {
      const persistence = createMockPersistence({ failedLoginAttempts: undefined as any });
      const result = UserMapper.toDomain(persistence);
      expect(result.failedLoginAttempts).toBe(0);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain to persistence', () => {
      const domain = createMockDomain();
      const result = UserMapper.toPersistence(domain);

      expect(result._id).toBe(domain.id);
      expect(result.email).toBe(domain.email);
      expect(result.passwordHash).toBe(domain.passwordHash);
      expect(result.firstName).toBe(domain.firstName);
      expect(result.lastName).toBe(domain.lastName);
      expect(result.role).toBe(domain.role);
      expect(result.permissions).toEqual(domain.permissions);
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of persistence to domain', () => {
      const persistenceArray = [
        createMockPersistence({ _id: 'user-1' }),
        createMockPersistence({ _id: 'user-2' }),
      ];

      const result = UserMapper.toDomainArray(persistenceArray);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
    });

    it('should return empty array for empty input', () => {
      const result = UserMapper.toDomainArray([]);
      expect(result).toEqual([]);
    });
  });
});

