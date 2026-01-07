import { describe, it, expect } from 'vitest';
import {
  appSchema,
  databaseSchema,
  redisSchema,
  aiSchema,
  storageSchema,
  integrationsSchema,
  observabilitySchema,
  envSchema,
} from './schemas';

describe('appSchema', () => {
  it('should validate valid NODE_ENV values', () => {
    const envs = ['development', 'staging', 'production', 'test'] as const;
    for (const env of envs) {
      const result = appSchema.safeParse({ NODE_ENV: env });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe(env);
      }
    }
  });

  it('should reject invalid NODE_ENV', () => {
    const result = appSchema.safeParse({ NODE_ENV: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should coerce PORT from string to number', () => {
    const result = appSchema.safeParse({ PORT: '4000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(4000);
      expect(typeof result.data.PORT).toBe('number');
    }
  });

  it('should reject PORT below 1', () => {
    const result = appSchema.safeParse({ PORT: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject PORT above 65535', () => {
    const result = appSchema.safeParse({ PORT: 70000 });
    expect(result.success).toBe(false);
  });

  it('should use default values when not provided', () => {
    const result = appSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(4000);
      expect(result.data.FRONTEND_URL).toBe('http://localhost:3000');
      expect(result.data.APP_VERSION).toBe('0.1.0');
    }
  });

  it('should accept valid FRONTEND_URL', () => {
    const result = appSchema.safeParse({ FRONTEND_URL: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid FRONTEND_URL', () => {
    const result = appSchema.safeParse({ FRONTEND_URL: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('databaseSchema', () => {
  const validDatabase: Record<string, string> = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_ANON_KEY: 'anon-key-value',
    SUPABASE_SERVICE_KEY: 'service-key-value',
    SUPABASE_JWT_SECRET: 'a'.repeat(32),
  };

  it('should accept valid database config', () => {
    const result = databaseSchema.safeParse(validDatabase);
    expect(result.success).toBe(true);
  });

  it('should require DATABASE_URL', () => {
    const { DATABASE_URL: _, ...withoutUrl } = validDatabase;
    const result = databaseSchema.safeParse(withoutUrl);
    expect(result.success).toBe(false);
  });

  it('should validate postgresql:// prefix', () => {
    const result = databaseSchema.safeParse({
      ...validDatabase,
      DATABASE_URL: 'http://localhost:5432/db',
    });
    expect(result.success).toBe(false);
  });

  it('should accept postgres:// prefix', () => {
    const result = databaseSchema.safeParse({
      ...validDatabase,
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    });
    expect(result.success).toBe(true);
  });

  it('should require SUPABASE_JWT_SECRET with min 32 chars', () => {
    const result = databaseSchema.safeParse({
      ...validDatabase,
      SUPABASE_JWT_SECRET: 'a'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('should require all SUPABASE_* variables', () => {
    const requiredFields = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
    for (const field of requiredFields) {
      const { [field]: _, ...withoutField } = validDatabase;
      const result = databaseSchema.safeParse(withoutField);
      expect(result.success).toBe(false);
    }
  });
});

describe('redisSchema', () => {
  it('should accept redis:// URLs', () => {
    const result = redisSchema.safeParse({ REDIS_URL: 'redis://localhost:6379' });
    expect(result.success).toBe(true);
  });

  it('should accept rediss:// URLs', () => {
    const result = redisSchema.safeParse({ REDIS_URL: 'rediss://localhost:6379' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid URLs', () => {
    const result = redisSchema.safeParse({ REDIS_URL: 'http://localhost:6379' });
    expect(result.success).toBe(false);
  });

  it('should require REDIS_URL', () => {
    const result = redisSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('aiSchema', () => {
  it('should require GEMINI_API_KEY when LLM_PROVIDER=gemini', () => {
    const result = aiSchema.safeParse({ LLM_PROVIDER: 'gemini' });
    expect(result.success).toBe(false);
  });

  it('should accept valid gemini config', () => {
    const result = aiSchema.safeParse({
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-api-key',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GEMINI_MODEL).toBe('gemini-2.0-flash-exp');
    }
  });

  it('should require ANTHROPIC_API_KEY when LLM_PROVIDER=claude', () => {
    const result = aiSchema.safeParse({ LLM_PROVIDER: 'claude' });
    expect(result.success).toBe(false);
  });

  it('should accept valid claude config', () => {
    const result = aiSchema.safeParse({
      LLM_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'test-api-key',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CLAUDE_MODEL).toBe('claude-sonnet-4-20250514');
    }
  });

  it('should not require ANTHROPIC_API_KEY when LLM_PROVIDER=gemini', () => {
    const result = aiSchema.safeParse({
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
    });
    expect(result.success).toBe(true);
  });

  it('should not require GEMINI_API_KEY when LLM_PROVIDER=claude', () => {
    const result = aiSchema.safeParse({
      LLM_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'test-key',
    });
    expect(result.success).toBe(true);
  });

  it('should use default model for each provider', () => {
    const geminiResult = aiSchema.safeParse({
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'key',
    });
    expect(geminiResult.success).toBe(true);
    if (geminiResult.success) {
      expect(geminiResult.data.GEMINI_MODEL).toBe('gemini-2.0-flash-exp');
    }

    const claudeResult = aiSchema.safeParse({
      LLM_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'key',
    });
    expect(claudeResult.success).toBe(true);
    if (claudeResult.success) {
      expect(claudeResult.data.CLAUDE_MODEL).toBe('claude-sonnet-4-20250514');
    }
  });

  it('should reject invalid LLM_PROVIDER', () => {
    const result = aiSchema.safeParse({ LLM_PROVIDER: 'openai' });
    expect(result.success).toBe(false);
  });
});

describe('storageSchema', () => {
  const validStorage: Record<string, string> = {
    R2_ACCOUNT_ID: 'account-id',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
  };

  it('should require R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY', () => {
    const requiredFields = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
    for (const field of requiredFields) {
      const { [field]: _, ...withoutField } = validStorage;
      const result = storageSchema.safeParse(withoutField);
      expect(result.success).toBe(false);
    }
  });

  it('should accept valid storage config', () => {
    const result = storageSchema.safeParse(validStorage);
    expect(result.success).toBe(true);
  });

  it('should use R2_BUCKET_NAME default', () => {
    const result = storageSchema.safeParse(validStorage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.R2_BUCKET_NAME).toBe('life-assistant');
    }
  });

  it('should allow R2_ENDPOINT to be optional', () => {
    const result = storageSchema.safeParse(validStorage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.R2_ENDPOINT).toBeUndefined();
    }
  });

  it('should accept valid R2_ENDPOINT', () => {
    const result = storageSchema.safeParse({
      ...validStorage,
      R2_ENDPOINT: 'http://localhost:9000',
    });
    expect(result.success).toBe(true);
  });
});

describe('integrationsSchema', () => {
  it('should allow all fields to be optional', () => {
    const result = integrationsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept empty string values', () => {
    const result = integrationsSchema.safeParse({
      TELEGRAM_BOT_TOKEN: '',
      GOOGLE_CLIENT_ID: '',
      STRIPE_SECRET_KEY: '',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid values', () => {
    const result = integrationsSchema.safeParse({
      TELEGRAM_BOT_TOKEN: 'bot-token',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      RESEND_API_KEY: 're_xxx',
    });
    expect(result.success).toBe(true);
  });
});

describe('observabilitySchema', () => {
  it('should allow SENTRY_DSN and AXIOM_TOKEN to be optional', () => {
    const result = observabilitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should use LOG_LEVEL default info', () => {
    const result = observabilitySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });

  it('should validate LOG_LEVEL enum', () => {
    const validLevels = ['debug', 'info', 'warn', 'error'] as const;
    for (const level of validLevels) {
      const result = observabilitySchema.safeParse({ LOG_LEVEL: level });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid LOG_LEVEL', () => {
    const result = observabilitySchema.safeParse({ LOG_LEVEL: 'trace' });
    expect(result.success).toBe(false);
  });

  it('should use AXIOM_DATASET default', () => {
    const result = observabilitySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.AXIOM_DATASET).toBe('life-assistant');
    }
  });

  it('should validate SENTRY_DSN as URL', () => {
    const result = observabilitySchema.safeParse({ SENTRY_DSN: 'not-a-url' });
    expect(result.success).toBe(false);

    const validResult = observabilitySchema.safeParse({
      SENTRY_DSN: 'https://xxx@sentry.io/123',
    });
    expect(validResult.success).toBe(true);
  });
});

describe('envSchema (combined)', () => {
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

  it('should validate complete valid environment', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const { DATABASE_URL: _, ...incomplete } = validEnv;
    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should include all schema fields in the result', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      // App fields
      expect(result.data.NODE_ENV).toBeDefined();
      expect(result.data.PORT).toBeDefined();
      // Database fields
      expect(result.data.DATABASE_URL).toBeDefined();
      expect(result.data.SUPABASE_URL).toBeDefined();
      // Redis fields
      expect(result.data.REDIS_URL).toBeDefined();
      // AI fields
      expect(result.data.LLM_PROVIDER).toBeDefined();
      // Storage fields
      expect(result.data.R2_ACCOUNT_ID).toBeDefined();
      // Observability defaults
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });
});
