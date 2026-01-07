/**
 * ApplicationError - Base class for application-level errors
 *
 * Use for errors that occur at the application layer (use cases, services).
 * Includes error code and HTTP status code for API responses.
 *
 * @example
 * throw new ApplicationError('Resource not found', 'NOT_FOUND', 404);
 * throw new ApplicationError('Invalid input', 'VALIDATION_ERROR', 400);
 * throw new ApplicationError('Unauthorized access', 'UNAUTHORIZED', 401);
 */
export class ApplicationError extends Error {
  public readonly name = 'ApplicationError';

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    Object.setPrototypeOf(this, ApplicationError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
