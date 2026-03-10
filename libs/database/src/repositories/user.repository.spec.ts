import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserRepository } from './user.repository';
import { UserModel } from '../schemas/user.schema';
import { UserRole, Permission } from '@fleetforge/security';

describe('UserRepository', () => {
  let repository: UserRepository;

  const mockDate = new Date('2024-01-15T10:00:00Z');

  const mockUserDoc = {
    _id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ADMIN,
    permissions: [Permission.DEVICE_READ],
    organizationId: 'org-123',
    isActive: true,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(UserModel.name),
          useValue: {
            ...mockUserModel,
            new: jest.fn().mockImplementation((data) => ({
              ...data,
              save: jest.fn().mockResolvedValue({
                toObject: () => ({ ...mockUserDoc, ...data }),
              }),
            })),
          },
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        toObject: () => mockUserDoc,
      });
      const MockUserModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const createModule: TestingModule = await Test.createTestingModule({
        providers: [
          UserRepository,
          { provide: getModelToken(UserModel.name), useValue: MockUserModel },
        ],
      }).compile();

      const repo = createModule.get<UserRepository>(UserRepository);

      const createData = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.ADMIN,
        permissions: [Permission.DEVICE_READ],
        organizationId: 'org-123',
      };

      const result = await repo.create(createData);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockUserDoc) }),
      });

      const result = await repository.findById('user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
    });

    it('should return null if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockUserModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockUserDoc) }),
      });

      const result = await repository.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('findByRefreshToken', () => {
    it('should find user by refresh token', async () => {
      mockUserModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockUserDoc) }),
      });

      const result = await repository.findByRefreshToken('refresh-token');
      expect(result).not.toBeNull();
    });
  });

  describe('findByOrganization', () => {
    it('should find users by organization', async () => {
      mockUserModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([mockUserDoc]) }),
      });

      const result = await repository.findByOrganization('org-123');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockUserDoc) }),
      });

      const result = await repository.update('user-123', { firstName: 'Jane' });
      expect(result).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      mockUserModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await repository.delete('user-123');
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockUserModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.emailExists('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.emailExists('nonexistent@example.com');
      expect(result).toBe(false);
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({ ...mockUserDoc, failedLoginAttempts: 1 }),
        }),
      });

      const result = await repository.incrementFailedAttempts('user-123');
      expect(result).not.toBeNull();
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({ ...mockUserDoc, failedLoginAttempts: 0 }),
        }),
      });

      const result = await repository.resetFailedAttempts('user-123');
      expect(result).not.toBeNull();
      expect(result?.failedLoginAttempts).toBe(0);
    });
  });
});
