import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { validateEnv, isEnvValid } from './validator';

const validEnv = {
  // App
  NODE_ENV: 'development',
  PORT: '4000',
  FRONTEND_URL: 'http://localhost:3000',
  // Database
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_KEY: 'service-key',
  SUPABASE_JWT_SECRET: 'a'.repeat(32),
  // Redis
  REDIS_URL: 'redis://localhost:6379',
  // Storage
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  // Python AI
  SERVICE_SECRET: 'test-secret',
};

describe('isEnvValid', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true for valid environment', () => {
    process.env = { ...validEnv };
    expect(isEnvValid()).toBe(true);
  });

  it('should return false for invalid environment', () => {
    process.env = {}; // Missing required fields
    expect(isEnvValid()).toBe(false);
  });

  it('should return false when required field is missing', () => {
    const { DATABASE_URL: _, ...incomplete } = validEnv;
    process.env = incomplete;
    expect(isEnvValid()).toBe(false);
  });

  it('should return false when field has invalid format', () => {
    process.env = {
      ...validEnv,
      DATABASE_URL: 'http://invalid-url', // Wrong prefix
    };
    expect(isEnvValid()).toBe(false);
  });
});

describe('validateEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: MockInstance<(code?: number | string | null) => never>;
  let errorSpy: MockInstance<typeof console.error>;
  let logSpy: MockInstance<typeof console.log>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('process.exit called');
    });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should call process.exit(1) for invalid environment', () => {
    process.env = {}; // Missing required fields
    try {
      validateEnv();
    } catch {
      // Expected - process.exit throws
    }
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log error messages for invalid environment', () => {
    process.env = {}; // Missing required fields
    try {
      validateEnv();
    } catch {
      // Expected - process.exit throws
    }
    expect(errorSpy).toHaveBeenCalled();
    const errorCalls = errorSpy.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === 'string')
      .join(' ');
    expect(errorCalls).toContain('Environment validation failed');
  });

  it('should log success message for valid environment', () => {
    process.env = { ...validEnv };
    validateEnv();
    expect(logSpy).toHaveBeenCalledWith('Environment validation passed');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should not call process.exit for valid environment', () => {
    process.env = { ...validEnv };
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should list invalid fields in error output', () => {
    process.env = { REDIS_URL: 'redis://localhost:6379' }; // Missing many required fields
    try {
      validateEnv();
    } catch {
      // Expected - process.exit throws
    }
    const errorCalls = errorSpy.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === 'string')
      .join(' ');
    expect(errorCalls).toContain('DATABASE_URL');
    expect(errorCalls).toContain('SUPABASE_URL');
  });

  it('should handle errors with invalid field value', () => {
    process.env = { ...validEnv, DATABASE_URL: 'http://invalid-prefix' };
    try {
      validateEnv();
    } catch {
      // Expected - process.exit throws
    }
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
