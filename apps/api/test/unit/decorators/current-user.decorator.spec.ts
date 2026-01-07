import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../../../src/common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../src/common/types/request.types.js';

function getParamDecoratorFactory<T>(decorator: () => ParameterDecorator) {
  class Test {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public test(@decorator() _value: T) {
      return _value;
    }
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  const key = Object.keys(args)[0];
  return args[key].factory;
}

describe('@CurrentUser() decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: { user?: AuthenticatedUser };

  beforeEach(() => {
    mockRequest = {};
    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  it('should_return_full_user_when_no_property_specified', () => {
    const user: AuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'authenticated',
    };
    mockRequest.user = user;

    const factory = getParamDecoratorFactory<AuthenticatedUser>(() => CurrentUser());
    const result = factory(undefined, mockExecutionContext);

    expect(result).toEqual(user);
  });

  it('should_return_specific_property_when_specified', () => {
    const user: AuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'authenticated',
    };
    mockRequest.user = user;

    const factory = getParamDecoratorFactory<string>(() => CurrentUser('id'));
    const result = factory('id', mockExecutionContext);

    expect(result).toBe('user-123');
  });

  it('should_return_undefined_when_no_user', () => {
    mockRequest.user = undefined;

    const factory = getParamDecoratorFactory<AuthenticatedUser>(() => CurrentUser());
    const result = factory(undefined, mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should_return_undefined_property_when_no_user', () => {
    mockRequest.user = undefined;

    const factory = getParamDecoratorFactory<string>(() => CurrentUser('id'));
    const result = factory('id', mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should_return_email_property', () => {
    const user: AuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
    };
    mockRequest.user = user;

    const factory = getParamDecoratorFactory<string>(() => CurrentUser('email'));
    const result = factory('email', mockExecutionContext);

    expect(result).toBe('test@example.com');
  });
});
