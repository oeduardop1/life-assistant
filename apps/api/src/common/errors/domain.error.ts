/**
 * DomainError - Base class for domain-level errors
 *
 * Use for business rule violations and domain logic errors.
 * These errors represent violations of business invariants.
 *
 * @example
 * throw new DomainError('User cannot have negative balance');
 * throw new DomainError('Decision must have at least 2 options');
 */
export class DomainError extends Error {
  public readonly name = 'DomainError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DomainError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
