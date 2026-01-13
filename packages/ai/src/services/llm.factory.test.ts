import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLLM, createLLMFromEnv, LLM_ENV_VARS } from './llm.factory.js';
import { ProviderConfigError } from '../errors/ai.errors.js';

// Mock config type
interface MockAdapterConfig {
  model: string;
  apiKey: string;
  defaultMaxTokens?: number;
  enableRateLimiting?: boolean;
  enableRetries?: boolean;
}

// Mock adapters
vi.mock('../adapters/claude.adapter.js', () => ({
  ClaudeAdapter: vi.fn().mockImplementation((config: MockAdapterConfig) => ({
    _type: 'claude',
    _config: config,
    getInfo: () => ({ name: 'claude', model: config.model }),
  })),
}));

vi.mock('../adapters/gemini.adapter.js', () => ({
  GeminiAdapter: vi.fn().mockImplementation((config: MockAdapterConfig) => ({
    _type: 'gemini',
    _config: config,
    getInfo: () => ({ name: 'gemini', model: config.model }),
  })),
}));

describe('llm.factory', () => {
  describe('createLLM', () => {
    it('should create ClaudeAdapter for provider "claude"', () => {
      const llm = createLLM({
        provider: 'claude',
        apiKey: 'test-anthropic-key',
      });

      expect((llm as unknown as { _type: string })._type).toBe('claude');
    });

    it('should create GeminiAdapter for provider "gemini"', () => {
      const llm = createLLM({
        provider: 'gemini',
        apiKey: 'test-gemini-key',
      });

      expect((llm as unknown as { _type: string })._type).toBe('gemini');
    });

    it('should use default model for claude', () => {
      const llm = createLLM({
        provider: 'claude',
        apiKey: 'test-key',
      });

      const config = (llm as unknown as { _config: { model: string } })._config;
      expect(config.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should use default model for gemini', () => {
      const llm = createLLM({
        provider: 'gemini',
        apiKey: 'test-key',
      });

      const config = (llm as unknown as { _config: { model: string } })._config;
      expect(config.model).toBe('gemini-2.5-flash');
    });

    it('should use custom model when provided', () => {
      const llm = createLLM({
        provider: 'claude',
        apiKey: 'test-key',
        model: 'claude-opus-4-20250514',
      });

      const config = (llm as unknown as { _config: { model: string } })._config;
      expect(config.model).toBe('claude-opus-4-20250514');
    });

    it('should pass optional config to adapter', () => {
      const llm = createLLM({
        provider: 'gemini',
        apiKey: 'test-key',
        defaultMaxTokens: 8192,
        enableRateLimiting: false,
        enableRetries: true,
      });

      const config = (llm as unknown as { _config: Record<string, unknown> })._config;
      expect(config.defaultMaxTokens).toBe(8192);
      expect(config.enableRateLimiting).toBe(false);
      expect(config.enableRetries).toBe(true);
    });

    it('should throw ProviderConfigError for missing API key', () => {
      expect(() =>
        createLLM({
          provider: 'claude',
          apiKey: '',
        })
      ).toThrow(ProviderConfigError);
    });

    it('should throw ProviderConfigError for unsupported provider', () => {
      expect(() =>
        createLLM({
          provider: 'openai' as 'claude',
          apiKey: 'test-key',
        })
      ).toThrow(ProviderConfigError);
    });
  });

  describe('createLLMFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should default to gemini provider', () => {
      process.env[LLM_ENV_VARS.GEMINI_API_KEY] = 'test-gemini-key';
      process.env.LLM_PROVIDER = undefined;

      const llm = createLLMFromEnv();

      expect((llm as unknown as { _type: string })._type).toBe('gemini');
    });

    it('should create Claude adapter when LLM_PROVIDER=claude', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'claude';
      process.env[LLM_ENV_VARS.ANTHROPIC_API_KEY] = 'test-anthropic-key';

      const llm = createLLMFromEnv();

      expect((llm as unknown as { _type: string })._type).toBe('claude');
    });

    it('should create Gemini adapter when LLM_PROVIDER=gemini', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'gemini';
      process.env[LLM_ENV_VARS.GEMINI_API_KEY] = 'test-gemini-key';

      const llm = createLLMFromEnv();

      expect((llm as unknown as { _type: string })._type).toBe('gemini');
    });

    it('should use LLM_MODEL when provided', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'claude';
      process.env[LLM_ENV_VARS.ANTHROPIC_API_KEY] = 'test-key';
      process.env[LLM_ENV_VARS.MODEL] = 'claude-opus-4-20250514';

      const llm = createLLMFromEnv();

      const config = (llm as unknown as { _config: { model: string } })._config;
      expect(config.model).toBe('claude-opus-4-20250514');
    });

    it('should throw ProviderConfigError when ANTHROPIC_API_KEY is missing for claude', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'claude';
      process.env.ANTHROPIC_API_KEY = undefined;

      expect(() => createLLMFromEnv()).toThrow(ProviderConfigError);
      expect(() => createLLMFromEnv()).toThrow('Missing ANTHROPIC_API_KEY');
    });

    it('should throw ProviderConfigError when GEMINI_API_KEY is missing for gemini', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'gemini';
      process.env.GEMINI_API_KEY = undefined;

      expect(() => createLLMFromEnv()).toThrow(ProviderConfigError);
      expect(() => createLLMFromEnv()).toThrow('Missing GEMINI_API_KEY');
    });

    it('should throw ProviderConfigError for invalid provider', () => {
      process.env[LLM_ENV_VARS.PROVIDER] = 'invalid';

      expect(() => createLLMFromEnv()).toThrow(ProviderConfigError);
      expect(() => createLLMFromEnv()).toThrow('Invalid LLM_PROVIDER');
    });
  });

  describe('LLM_ENV_VARS', () => {
    it('should have correct variable names', () => {
      expect(LLM_ENV_VARS.PROVIDER).toBe('LLM_PROVIDER');
      expect(LLM_ENV_VARS.ANTHROPIC_API_KEY).toBe('ANTHROPIC_API_KEY');
      expect(LLM_ENV_VARS.GEMINI_API_KEY).toBe('GEMINI_API_KEY');
      expect(LLM_ENV_VARS.MODEL).toBe('LLM_MODEL');
    });
  });
});
