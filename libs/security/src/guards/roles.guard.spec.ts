import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';
import { UserRole } from '../types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext({ role: UserRole.VIEWER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when empty roles array is required', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = mockExecutionContext({ role: UserRole.VIEWER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User not authenticated');
  });

  it('should return true when user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OPERATOR]);
    const context = mockExecutionContext({ role: UserRole.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user has the exact required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.DEVICE]);
    const context = mockExecutionContext({ role: UserRole.DEVICE });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockExecutionContext({ role: UserRole.VIEWER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('should throw ForbiddenException with required roles in message', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OPERATOR]);
    const context = mockExecutionContext({ role: UserRole.VIEWER });

    try {
      guard.canActivate(context);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain(UserRole.ADMIN);
      expect(error.message).toContain(UserRole.OPERATOR);
    }
  });

  it('should export ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
