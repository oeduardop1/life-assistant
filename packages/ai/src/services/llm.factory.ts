/**
 * LLM Factory for creating provider adapters.
 * @module services/llm.factory
 */

import { ClaudeAdapter, type ClaudeAdapterConfig } from '../adapters/claude.adapter.js';
import { GeminiAdapter, type GeminiAdapterConfig } from '../adapters/gemini.adapter.js';
import type { LLMPort } from '../ports/llm.port.js';
import { ProviderConfigError } from '../errors/ai.errors.js';

/**
 * Supported LLM providers.
 */
export type LLMProvider = 'claude' | 'gemini';

/**
 * Configuration for creating an LLM adapter.
 */
export interface LLMFactoryConfig {
  /** Provider to use */
  provider: LLMProvider;
  /** API key for the provider */
  apiKey: string;
  /** Model to use (provider-specific) */
  model?: string;
  /** Default max tokens for responses */
  defaultMaxTokens?: number;
  /** Enable rate limiting */
  enableRateLimiting?: boolean;
  /** Enable automatic retries */
  enableRetries?: boolean;
}

/**
 * Default models for each provider.
 */
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  claude: 'claude-sonnet-4-5-20250929',
  gemini: 'gemini-2.5-flash',
};

/**
 * Creates an LLM adapter for the specified provider.
 *
 * @param config - Factory configuration
 * @returns LLM adapter instance
 * @throws ProviderConfigError if provider is invalid or config is missing
 *
 * @example
 * ```typescript
 * const llm = createLLM({
 *   provider: 'claude',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 * ```
 */
export function createLLM(config: LLMFactoryConfig): LLMPort {
  const { provider, apiKey, model, defaultMaxTokens, enableRateLimiting, enableRetries } = config;

  if (!apiKey) {
    throw new ProviderConfigError(`API key is required for provider: ${provider}`);
  }

  switch (provider) {
    case 'claude': {
      const claudeConfig: ClaudeAdapterConfig = {
        apiKey,
        model: model ?? DEFAULT_MODELS.claude,
        ...(defaultMaxTokens !== undefined && { defaultMaxTokens }),
        ...(enableRateLimiting !== undefined && { enableRateLimiting }),
        ...(enableRetries !== undefined && { enableRetries }),
      };
      return new ClaudeAdapter(claudeConfig);
    }

    case 'gemini': {
      const geminiConfig: GeminiAdapterConfig = {
        apiKey,
        model: model ?? DEFAULT_MODELS.gemini,
        ...(defaultMaxTokens !== undefined && { defaultMaxTokens }),
        ...(enableRateLimiting !== undefined && { enableRateLimiting }),
        ...(enableRetries !== undefined && { enableRetries }),
      };
      return new GeminiAdapter(geminiConfig);
    }

    default:
      throw new ProviderConfigError(`Unsupported LLM provider: ${provider as string}`);
  }
}

/**
 * Environment variable names for LLM configuration.
 */
export const LLM_ENV_VARS = {
  PROVIDER: 'LLM_PROVIDER',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  MODEL: 'LLM_MODEL',
} as const;

/**
 * Creates an LLM adapter from environment variables.
 *
 * Reads configuration from:
 * - LLM_PROVIDER: 'claude' | 'gemini' (default: 'gemini')
 * - ANTHROPIC_API_KEY: API key for Claude
 * - GEMINI_API_KEY: API key for Gemini
 * - LLM_MODEL: Optional model override
 *
 * @returns LLM adapter instance
 * @throws ProviderConfigError if required environment variables are missing
 *
 * @example
 * ```typescript
 * // Set environment variables:
 * // LLM_PROVIDER=claude
 * // ANTHROPIC_API_KEY=sk-ant-...
 *
 * const llm = createLLMFromEnv();
 * ```
 */
export function createLLMFromEnv(): LLMPort {
  const provider = (process.env[LLM_ENV_VARS.PROVIDER] ?? 'gemini') as LLMProvider;

  // Get the appropriate API key based on provider
  let apiKey: string | undefined;

  switch (provider) {
    case 'claude':
      apiKey = process.env[LLM_ENV_VARS.ANTHROPIC_API_KEY];
      if (!apiKey) {
        throw new ProviderConfigError(
          `Missing ${LLM_ENV_VARS.ANTHROPIC_API_KEY} environment variable for Claude provider`
        );
      }
      break;

    case 'gemini':
      apiKey = process.env[LLM_ENV_VARS.GEMINI_API_KEY];
      if (!apiKey) {
        throw new ProviderConfigError(
          `Missing ${LLM_ENV_VARS.GEMINI_API_KEY} environment variable for Gemini provider`
        );
      }
      break;

    default:
      throw new ProviderConfigError(
        `Invalid ${LLM_ENV_VARS.PROVIDER} value: ${String(provider)}. Must be 'claude' or 'gemini'`
      );
  }

  const model = process.env[LLM_ENV_VARS.MODEL];

  return createLLM({
    provider,
    apiKey,
    ...(model && { model }),
  });
}
