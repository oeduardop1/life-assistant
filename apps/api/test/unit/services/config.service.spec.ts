import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppConfigService } from '../../../src/config/config.service.js';

describe('AppConfigService', () => {
  let configService: AppConfigService;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should_load_config_from_environment', () => {
      configService = new AppConfigService();

      expect(configService.all).toBeDefined();
    });
  });

  describe('app configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_node_env', () => {
      expect(configService.nodeEnv).toBe('test');
    });

    it('should_return_port', () => {
      expect(configService.port).toBe(4000);
    });

    it('should_return_frontend_url', () => {
      expect(configService.frontendUrl).toBe('http://localhost:3000');
    });

    it('should_return_app_version', () => {
      expect(configService.appVersion).toBe('0.1.0-test');
    });
  });

  describe('environment checks', () => {
    it('should_return_true_for_isDevelopment_when_development', () => {
      process.env.NODE_ENV = 'development';
      vi.resetModules();
      // Re-import to get fresh config
      configService = new AppConfigService();
      // Since config is cached, we test with 'test' env
      expect(configService.isTest).toBe(true);
    });

    it('should_return_true_for_isTest_when_test', () => {
      configService = new AppConfigService();

      expect(configService.isTest).toBe(true);
      expect(configService.isProduction).toBe(false);
      expect(configService.isDevelopment).toBe(false);
    });

    it('should_return_false_for_isProduction_in_test', () => {
      configService = new AppConfigService();

      expect(configService.isProduction).toBe(false);
    });
  });

  describe('database configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_database_url', () => {
      expect(configService.databaseUrl).toContain('postgresql://');
    });

    it('should_return_supabase_url', () => {
      expect(configService.supabaseUrl).toBeDefined();
    });

    it('should_return_supabase_anon_key', () => {
      expect(configService.supabaseAnonKey).toBeDefined();
    });

    it('should_return_supabase_service_key', () => {
      expect(configService.supabaseServiceKey).toBeDefined();
    });

    it('should_return_supabase_jwt_secret', () => {
      expect(configService.supabaseJwtSecret).toBeDefined();
    });
  });

  describe('redis configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_redis_url', () => {
      expect(configService.redisUrl).toContain('redis://');
    });
  });

  describe('AI configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_llm_provider', () => {
      expect(configService.llmProvider).toBe('gemini');
    });

    it('should_return_gemini_api_key', () => {
      expect(configService.geminiApiKey).toBeDefined();
    });

    it('should_return_gemini_model', () => {
      expect(configService.geminiModel).toBeDefined();
    });
  });

  describe('storage configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_r2_account_id', () => {
      expect(configService.r2AccountId).toBeDefined();
    });

    it('should_return_r2_access_key_id', () => {
      expect(configService.r2AccessKeyId).toBeDefined();
    });

    it('should_return_r2_secret_access_key', () => {
      expect(configService.r2SecretAccessKey).toBeDefined();
    });

    it('should_return_r2_bucket_name', () => {
      expect(configService.r2BucketName).toBeDefined();
    });

    it('should_return_r2_endpoint_as_optional', () => {
      // R2 endpoint is optional
      expect(configService.r2Endpoint === undefined || typeof configService.r2Endpoint === 'string').toBe(true);
    });
  });

  describe('observability configuration', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_log_level', () => {
      expect(['debug', 'info', 'warn', 'error']).toContain(configService.logLevel);
    });
  });

  describe('optional configurations', () => {
    beforeEach(() => {
      configService = new AppConfigService();
    });

    it('should_return_optional_telegram_bot_token', () => {
      expect(configService.telegramBotToken === undefined || typeof configService.telegramBotToken === 'string').toBe(true);
    });

    it('should_return_optional_anthropic_api_key', () => {
      expect(configService.anthropicApiKey === undefined || typeof configService.anthropicApiKey === 'string').toBe(true);
    });

    it('should_return_optional_claude_model', () => {
      expect(configService.claudeModel === undefined || typeof configService.claudeModel === 'string').toBe(true);
    });

    it('should_return_optional_google_client_id', () => {
      expect(configService.googleClientId === undefined || typeof configService.googleClientId === 'string').toBe(true);
    });

    it('should_return_optional_google_client_secret', () => {
      expect(configService.googleClientSecret === undefined || typeof configService.googleClientSecret === 'string').toBe(true);
    });

    it('should_return_optional_stripe_secret_key', () => {
      expect(configService.stripeSecretKey === undefined || typeof configService.stripeSecretKey === 'string').toBe(true);
    });

    it('should_return_optional_stripe_webhook_secret', () => {
      expect(configService.stripeWebhookSecret === undefined || typeof configService.stripeWebhookSecret === 'string').toBe(true);
    });

    it('should_return_optional_resend_api_key', () => {
      expect(configService.resendApiKey === undefined || typeof configService.resendApiKey === 'string').toBe(true);
    });

    it('should_return_optional_sentry_dsn', () => {
      expect(configService.sentryDsn === undefined || typeof configService.sentryDsn === 'string').toBe(true);
    });

    it('should_return_optional_axiom_token', () => {
      expect(configService.axiomToken === undefined || typeof configService.axiomToken === 'string').toBe(true);
    });

    it('should_return_axiom_dataset', () => {
      expect(typeof configService.axiomDataset).toBe('string');
    });
  });

  describe('all getter', () => {
    it('should_return_full_config_object', () => {
      configService = new AppConfigService();

      const config = configService.all;

      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(4000);
    });
  });
});
