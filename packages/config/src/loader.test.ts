import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { loadConfig, getConfig, clearConfigCache, formatZodError } from './loader';

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
  // AI
  LLM_PROVIDER: 'gemini',
  GEMINI_API_KEY: 'gemini-key',
  // Storage
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
};

describe('loadConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    clearConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigCache();
  });

  it('should return valid config with correct environment', () => {
    process.env = { ...validEnv };
    const config = loadConfig();
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.LLM_PROVIDER).toBe('gemini');
  });

  it('should throw error for invalid environment', () => {
    process.env = {};
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });

  it('should cache config after first call', () => {
    process.env = { ...validEnv };
    const config1 = loadConfig();
    // Modify env after first load
    process.env.PORT = '5000';
    const config2 = loadConfig();
    // Should return cached config with original PORT
    expect(config2.PORT).toBe(config1.PORT);
    expect(config2).toBe(config1); // Same reference
  });

  it('should list all invalid fields in error message', () => {
    process.env = { LLM_PROVIDER: 'gemini' }; // Missing required fields
    try {
      loadConfig();
      expect.fail('Should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('SUPABASE_URL');
      expect(message).toContain('REDIS_URL');
    }
  });

  it('should NOT expose secret values in error message', () => {
    process.env = {
      ...validEnv,
      SUPABASE_JWT_SECRET: 'short', // Invalid - too short
    };
    try {
      loadConfig();
      expect.fail('Should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      // Should mention the field name but not the value
      expect(message).toContain('SUPABASE_JWT_SECRET');
      expect(message).not.toContain('short');
    }
  });

  it('should coerce PORT from string to number', () => {
    process.env = { ...validEnv, PORT: '8080' };
    const config = loadConfig();
    expect(config.PORT).toBe(8080);
    expect(typeof config.PORT).toBe('number');
  });

  it('should apply default values', () => {
    process.env = { ...validEnv };
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    const config = loadConfig();
    expect(config.PORT).toBe(4000);
    expect(config.LOG_LEVEL).toBe('info');
  });
});

describe('getConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    clearConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigCache();
  });

  it('should return cached config if exists', () => {
    process.env = { ...validEnv };
    const config1 = loadConfig(); // Populates cache
    const config2 = getConfig();
    expect(config2).toBe(config1); // Same reference
  });

  it('should load config if cache is empty', () => {
    process.env = { ...validEnv };
    const config = getConfig();
    expect(config.NODE_ENV).toBe('development');
  });
});

describe('clearConfigCache', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    clearConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigCache();
  });

  it('should clear cache correctly', () => {
    process.env = { ...validEnv };
    const config1 = loadConfig();
    clearConfigCache();
    // Modify env after clearing cache
    process.env = { ...validEnv, PORT: '9000' };
    const config2 = loadConfig();
    // Should have new PORT value
    expect(config2.PORT).toBe(9000);
    expect(config2.PORT).not.toBe(config1.PORT);
  });

  it('should allow next call to reload config', () => {
    process.env = { ...validEnv, NODE_ENV: 'production' };
    loadConfig();
    clearConfigCache();
    process.env = { ...validEnv, NODE_ENV: 'test' };
    const config = getConfig();
    expect(config.NODE_ENV).toBe('test');
  });
});

describe('formatZodError', () => {
  it('should format error with field path', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('name:');
    }
  });

  it('should use "unknown" for empty path', () => {
    // Create a schema that produces an error with empty path
    const schema = z.string().refine(() => false, { message: 'Root error' });
    const result = schema.safeParse('test');
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('unknown:');
      expect(formatted).toContain('Root error');
    }
  });
});
