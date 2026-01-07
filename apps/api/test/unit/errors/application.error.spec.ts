import { describe, it, expect } from 'vitest';
import { ApplicationError } from '../../../src/common/errors/application.error.js';

describe('ApplicationError', () => {
  it('should_create_error_with_message_and_code', () => {
    const error = new ApplicationError('Not found', 'NOT_FOUND');

    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('ApplicationError');
  });

  it('should_use_default_status_code_400', () => {
    const error = new ApplicationError('Bad request', 'BAD_REQUEST');

    expect(error.statusCode).toBe(400);
  });

  it('should_accept_custom_status_code', () => {
    const error = new ApplicationError('Not found', 'NOT_FOUND', 404);

    expect(error.statusCode).toBe(404);
  });

  it('should_be_instance_of_error', () => {
    const error = new ApplicationError('Test', 'TEST');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApplicationError);
  });

  it('should_have_stack_trace', () => {
    const error = new ApplicationError('Test', 'TEST');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ApplicationError');
  });

  it('should_maintain_prototype_chain', () => {
    const error = new ApplicationError('Test', 'TEST');

    expect(Object.getPrototypeOf(error)).toBe(ApplicationError.prototype);
  });
});
