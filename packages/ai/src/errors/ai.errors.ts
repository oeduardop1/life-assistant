/**
 * Custom error classes for the AI module.
 * @module errors/ai.errors
 */

/**
 * Base error class for all AI-related errors.
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AIError';
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when LLM provider is not configured correctly.
 */
export class ProviderConfigError extends AIError {
  constructor(message: string, cause?: Error) {
    super(message, 'PROVIDER_CONFIG_ERROR', cause);
    this.name = 'ProviderConfigError';
  }
}

/**
 * Error thrown when LLM API call fails.
 */
export class LLMAPIError extends AIError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly provider?: string,
    cause?: Error,
  ) {
    super(message, 'LLM_API_ERROR', cause);
    this.name = 'LLMAPIError';
  }

  /**
   * Check if error is retryable (rate limit, server error, timeout).
   */
  get isRetryable(): boolean {
    if (!this.statusCode) {
      const msg = this.message.toLowerCase();
      return (
        msg.includes('rate limit') ||
        msg.includes('timeout') ||
        msg.includes('econnreset') ||
        msg.includes('enotfound')
      );
    }
    return (
      this.statusCode === 429 ||
      (this.statusCode >= 500 && this.statusCode < 600)
    );
  }
}

/**
 * Error thrown when rate limit is exceeded.
 */
export class RateLimitError extends AIError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    cause?: Error,
  ) {
    super(message, 'RATE_LIMIT_ERROR', cause);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when a tool is not found.
 */
export class ToolNotFoundError extends AIError {
  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`, 'TOOL_NOT_FOUND');
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Error thrown when tool execution fails.
 */
export class ToolExecutionError extends AIError {
  constructor(
    toolName: string,
    message: string,
    cause?: Error,
  ) {
    super(`Tool "${toolName}" execution failed: ${message}`, 'TOOL_EXECUTION_ERROR', cause);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error thrown when tool parameters validation fails.
 */
export class ToolValidationError extends AIError {
  constructor(
    toolName: string,
    public readonly validationErrors: string[],
  ) {
    super(
      `Tool "${toolName}" validation failed: ${validationErrors.join(', ')}`,
      'TOOL_VALIDATION_ERROR',
    );
    this.name = 'ToolValidationError';
  }
}

/**
 * Error thrown when max tool loop iterations is exceeded.
 */
export class MaxIterationsExceededError extends AIError {
  constructor(maxIterations: number) {
    super(
      `Max tool loop iterations (${String(maxIterations)}) exceeded`,
      'MAX_ITERATIONS_EXCEEDED',
    );
    this.name = 'MaxIterationsExceededError';
  }
}

/**
 * Error thrown when streaming fails.
 */
export class StreamingError extends AIError {
  constructor(message: string, cause?: Error) {
    super(message, 'STREAMING_ERROR', cause);
    this.name = 'StreamingError';
  }
}
