import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { Public, IS_PUBLIC_KEY } from '../../../src/common/decorators/public.decorator.js';

describe('@Public() decorator', () => {
  const reflector = new Reflector();

  it('should_set_is_public_metadata_to_true', () => {
    @Public()
    class TestController {}

    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, TestController);

    expect(isPublic).toBe(true);
  });

  it('should_work_on_methods', () => {
    class TestController {
      @Public()
      testMethod() {
        return 'test';
      }
    }

    const controller = new TestController();
    const isPublic = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      controller.testMethod,
    );

    expect(isPublic).toBe(true);
  });

  it('should_not_set_metadata_on_unmarked_class', () => {
    class UnmarkedController {}

    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, UnmarkedController);

    expect(isPublic).toBeUndefined();
  });

  it('should_export_IS_PUBLIC_KEY_constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
