import { describe, it, expect } from 'vitest';
import { DomainError } from '../../../src/common/errors/domain.error.js';

describe('DomainError', () => {
  it('should_create_error_with_message', () => {
    const error = new DomainError('Business rule violated');

    expect(error.message).toBe('Business rule violated');
    expect(error.name).toBe('DomainError');
  });

  it('should_be_instance_of_error', () => {
    const error = new DomainError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
  });

  it('should_have_stack_trace', () => {
    const error = new DomainError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('DomainError');
  });

  it('should_maintain_prototype_chain', () => {
    const error = new DomainError('Test error');

    expect(Object.getPrototypeOf(error)).toBe(DomainError.prototype);
  });
});
