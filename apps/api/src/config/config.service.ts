import { Injectable } from '@nestjs/common';
import { getConfig, type EnvConfig } from '@life-assistant/config';

/**
 * AppConfigService - NestJS wrapper for @life-assistant/config
 *
 * Provides type-safe access to environment configuration.
 * Config is loaded and validated once on application startup.
 */
@Injectable()
export class AppConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = getConfig();
  }

  /** Full configuration object */
  get all(): EnvConfig {
    return this.config;
  }

  // ============================================
  // App Configuration
  // ============================================

  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  get port(): number {
    return this.config.PORT;
  }

  get frontendUrl(): string {
    return this.config.FRONTEND_URL;
  }

  get appVersion(): string {
    return this.config.APP_VERSION;
  }

  // ============================================
  // Database Configuration
  // ============================================

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get supabaseUrl(): string {
    return this.config.SUPABASE_URL;
  }

  get supabaseAnonKey(): string {
    return this.config.SUPABASE_ANON_KEY;
  }

  get supabaseServiceKey(): string {
    return this.config.SUPABASE_SERVICE_KEY;
  }

  get supabaseJwtSecret(): string {
    return this.config.SUPABASE_JWT_SECRET;
  }

  // ============================================
  // Redis Configuration
  // ============================================

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }

  // ============================================
  // AI Configuration
  // ============================================

  get llmProvider(): 'gemini' | 'claude' {
    return this.config.LLM_PROVIDER;
  }

  get geminiApiKey(): string | undefined {
    return this.config.GEMINI_API_KEY;
  }

  get geminiModel(): string | undefined {
    return this.config.GEMINI_MODEL;
  }

  get anthropicApiKey(): string | undefined {
    return this.config.ANTHROPIC_API_KEY;
  }

  get claudeModel(): string | undefined {
    return this.config.CLAUDE_MODEL;
  }

  // ============================================
  // Storage Configuration (R2)
  // ============================================

  get r2AccountId(): string {
    return this.config.R2_ACCOUNT_ID;
  }

  get r2AccessKeyId(): string {
    return this.config.R2_ACCESS_KEY_ID;
  }

  get r2SecretAccessKey(): string {
    return this.config.R2_SECRET_ACCESS_KEY;
  }

  get r2BucketName(): string {
    return this.config.R2_BUCKET_NAME;
  }

  get r2Endpoint(): string | undefined {
    return this.config.R2_ENDPOINT;
  }

  // ============================================
  // Integrations Configuration
  // ============================================

  get telegramBotToken(): string | undefined {
    return this.config.TELEGRAM_BOT_TOKEN;
  }

  get googleClientId(): string | undefined {
    return this.config.GOOGLE_CLIENT_ID;
  }

  get googleClientSecret(): string | undefined {
    return this.config.GOOGLE_CLIENT_SECRET;
  }

  get stripeSecretKey(): string | undefined {
    return this.config.STRIPE_SECRET_KEY;
  }

  get stripeWebhookSecret(): string | undefined {
    return this.config.STRIPE_WEBHOOK_SECRET;
  }

  get resendApiKey(): string | undefined {
    return this.config.RESEND_API_KEY;
  }

  // ============================================
  // Observability Configuration
  // ============================================

  get sentryDsn(): string | undefined {
    return this.config.SENTRY_DSN;
  }

  get axiomToken(): string | undefined {
    return this.config.AXIOM_TOKEN;
  }

  get axiomDataset(): string {
    return this.config.AXIOM_DATASET;
  }

  get logLevel(): 'debug' | 'info' | 'warn' | 'error' {
    return this.config.LOG_LEVEL;
  }
}
