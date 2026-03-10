import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard, PERMISSIONS_KEY } from './permissions.guard';
import { Permission } from '../types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
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
    guard = new PermissionsGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext({ permissions: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when empty permissions array is required', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = mockExecutionContext({ permissions: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DEVICE_READ]);
    const context = mockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User not authenticated');
  });

  it('should throw ForbiddenException when user has no permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DEVICE_READ]);
    const context = mockExecutionContext({ role: 'user' }); // no permissions property

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User has no permissions');
  });

  it('should throw ForbiddenException when user permissions is not an array', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DEVICE_READ]);
    const context = mockExecutionContext({ permissions: 'invalid' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User has no permissions');
  });

  it('should return true when user has all required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DEVICE_READ, Permission.DEVICE_WRITE]);
    const context = mockExecutionContext({
      permissions: [Permission.DEVICE_READ, Permission.DEVICE_WRITE, Permission.TELEMETRY_READ],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DEVICE_READ, Permission.DEVICE_WRITE]);
    const context = mockExecutionContext({
      permissions: [Permission.DEVICE_READ], // missing DEVICE_WRITE
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('should export PERMISSIONS_KEY constant', () => {
    expect(PERMISSIONS_KEY).toBe('permissions');
  });
});

