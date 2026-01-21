/**
 * Claude adapter for LLM operations.
 * Implements LLMPort interface using Anthropic SDK.
 * @module adapters/claude.adapter
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ContentBlockParam,
  ToolUseBlock,
  TextBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
  LLMPort,
  ChatParams,
  ChatResponse,
  ChatWithToolsParams,
  ChatWithToolsResponse,
  StreamChunk,
  ProviderInfo,
  Message,
  ToolDefinition,
  ToolCall,
  ToolChoice,
  FinishReason,
  TokenUsage,
} from '../ports/llm.port.js';
import { LLMAPIError, StreamingError } from '../errors/ai.errors.js';
import { type RateLimiter, getRateLimiter } from '../utils/rate-limiter.js';
import { retryWithBackoff } from '../utils/retry.js';

/**
 * Configuration for Claude adapter.
 */
export interface ClaudeAdapterConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Model to use (e.g., 'claude-sonnet-4-5-20250929') */
  model: string;
  /** Default max tokens for responses */
  defaultMaxTokens?: number;
  /** Enable rate limiting */
  enableRateLimiting?: boolean;
  /** Enable automatic retries */
  enableRetries?: boolean;
}

/**
 * SDK version for provider info.
 */
const SDK_VERSION = '0.71.2';

/**
 * Beta header for advanced tool use features.
 */
const TOOL_USE_BETA = 'advanced-tool-use-2025-11-20';

/**
 * Claude adapter implementing LLMPort interface.
 *
 * @example
 * ```typescript
 * const claude = new ClaudeAdapter({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-sonnet-4-5-20250929',
 * });
 *
 * const response = await claude.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export class ClaudeAdapter implements LLMPort {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly rateLimiter: RateLimiter | null;
  private readonly enableRetries: boolean;

  constructor(config: ClaudeAdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
    this.rateLimiter = config.enableRateLimiting !== false
      ? getRateLimiter('claude')
      : null;
    this.enableRetries = config.enableRetries !== false;
  }

  /**
   * Send a chat completion request.
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const execute = async () => {
      // Rate limiting
      await this.rateLimiter?.checkAndWait(this.estimateTokens(params));

      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: params.maxTokens ?? this.defaultMaxTokens,
          ...(params.systemPrompt && { system: params.systemPrompt }),
          messages: this.convertMessages(params.messages),
          ...(params.temperature !== undefined && { temperature: params.temperature }),
        });

        const usage = this.extractUsage(response);
        this.rateLimiter?.recordActualUsage(usage.inputTokens + usage.outputTokens);

        return this.mapResponse(response);
      } catch (error) {
        throw this.wrapError(error);
      }
    };

    return this.enableRetries ? retryWithBackoff(execute) : execute();
  }

  /**
   * Send a chat completion request with tool use support.
   */
  async chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse> {
    const execute = async () => {
      await this.rateLimiter?.checkAndWait(this.estimateTokens(params));

      try {
        const tools = params.tools.map((tool) => this.convertTool(tool));

        const response = await this.client.beta.messages.create({
          model: this.model,
          max_tokens: params.maxTokens ?? this.defaultMaxTokens,
          ...(params.systemPrompt && { system: params.systemPrompt }),
          messages: this.convertMessages(params.messages),
          ...(params.temperature !== undefined && { temperature: params.temperature }),
          tools,
          tool_choice: this.mapToolChoice(params.toolChoice),
          betas: [TOOL_USE_BETA],
        });

        const usage = this.extractUsage(response);
        this.rateLimiter?.recordActualUsage(usage.inputTokens + usage.outputTokens);

        return this.mapToolResponse(response);
      } catch (error) {
        throw this.wrapError(error);
      }
    };

    return this.enableRetries ? retryWithBackoff(execute) : execute();
  }

  /**
   * Send a streaming chat completion request.
   */
  async *stream(params: ChatParams): AsyncIterable<StreamChunk> {
    await this.rateLimiter?.checkAndWait(this.estimateTokens(params));

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: params.maxTokens ?? this.defaultMaxTokens,
        ...(params.systemPrompt && { system: params.systemPrompt }),
        messages: this.convertMessages(params.messages),
        ...(params.temperature !== undefined && { temperature: params.temperature }),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            yield { content: delta.text, done: false };
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      throw new StreamingError('Stream failed', error as Error);
    }
  }

  /**
   * Send a streaming chat completion request with tool use support.
   */
  async *streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk> {
    await this.rateLimiter?.checkAndWait(this.estimateTokens(params));

    try {
      const tools = params.tools.map((tool) => this.convertTool(tool));

      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: params.maxTokens ?? this.defaultMaxTokens,
        ...(params.systemPrompt && { system: params.systemPrompt }),
        messages: this.convertMessages(params.messages),
        ...(params.temperature !== undefined && { temperature: params.temperature }),
        tools,
        tool_choice: this.mapToolChoice(params.toolChoice),
        betas: [TOOL_USE_BETA],
      });

      const toolCalls: ToolCall[] = [];
      let currentToolUse: Partial<ToolCall> | null = null;
      let currentToolInput = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            currentToolUse = {
              id: block.id,
              name: block.name,
            };
            currentToolInput = '';
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            yield { content: delta.text, done: false };
          } else if ('partial_json' in delta && currentToolUse) {
            currentToolInput += delta.partial_json;
          }
        } else if (event.type === 'content_block_stop' && currentToolUse) {
          try {
            currentToolUse.arguments = JSON.parse(currentToolInput || '{}') as Record<string, unknown>;
            toolCalls.push(currentToolUse as ToolCall);
          } catch {
            // Invalid JSON, skip this tool call
          }
          currentToolUse = null;
          currentToolInput = '';
        }
      }

      yield {
        content: '',
        done: true,
        ...(toolCalls.length > 0 && { toolCalls }),
      };
    } catch (error) {
      throw new StreamingError('Stream with tools failed', error as Error);
    }
  }

  /**
   * Get provider information.
   */
  getInfo(): ProviderInfo {
    return {
      name: 'claude',
      model: this.model,
      version: SDK_VERSION,
      supportsToolUse: true,
      supportsStreaming: true,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private convertMessages(messages: Message[]): MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system') // System is passed separately
      .map((message) => {
        if (message.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: message.toolCallId ?? '',
                content: message.content,
              },
            ],
          };
        }

        if (message.role === 'assistant' && message.toolCalls?.length) {
          const content: ContentBlockParam[] = [];
          if (message.content) {
            content.push({ type: 'text' as const, text: message.content });
          }
          for (const toolCall of message.toolCalls) {
            content.push({
              type: 'tool_use' as const,
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.arguments,
            });
          }
          return {
            role: 'assistant' as const,
            content,
          };
        }

        return {
          role: message.role as 'user' | 'assistant',
          content: message.content,
        };
      });
  }

  private convertTool(tool: ToolDefinition): Anthropic.Beta.BetaTool {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    const inputSchema = zodToJsonSchema(tool.parameters as any) as Anthropic.Beta.BetaTool.InputSchema;
    // Cast inputExamples to the expected type for Anthropic API
    const inputExamples = tool.inputExamples as Record<string, unknown>[] | undefined;
    return {
      name: tool.name,
      description: tool.description,
      input_schema: inputSchema,
      // Native input_examples support via beta API
      ...(inputExamples && { input_examples: inputExamples }),
    };
  }

  private mapToolChoice(choice?: ToolChoice): Anthropic.Beta.BetaToolChoice {
    // Force specific tool
    if (typeof choice === 'object') {
      return { type: 'tool', name: choice.toolName };
    }

    // String modes
    switch (choice) {
      case 'required':
        return { type: 'any' };
      case 'none':
        return { type: 'auto' }; // Claude doesn't have 'none', use auto
      default:
        return { type: 'auto' };
    }
  }

  private mapResponse(response: Anthropic.Message): ChatResponse {
    const textContent = response.content.find(
      (block): block is TextBlock => block.type === 'text',
    );

    return {
      content: textContent?.text ?? '',
      usage: this.extractUsage(response),
      finishReason: this.mapFinishReason(response.stop_reason),
    };
  }

  private mapToolResponse(
    response: Anthropic.Beta.BetaMessage,
  ): ChatWithToolsResponse {
    const textContent = response.content.find(
      (block): block is TextBlock => block.type === 'text',
    );

    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use',
    );

    const toolCalls: ToolCall[] = toolUseBlocks.map((block) => ({
      id: block.id,
      name: block.name,
      arguments: block.input as Record<string, unknown>,
    }));

    return {
      content: textContent?.text ?? '',
      usage: this.extractUsage(response),
      finishReason: this.mapFinishReason(response.stop_reason),
      ...(toolCalls.length > 0 && { toolCalls }),
    };
  }

  private extractUsage(response: Anthropic.Message | Anthropic.Beta.BetaMessage): TokenUsage {
    return {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  private mapFinishReason(stopReason: string | null): FinishReason {
    switch (stopReason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }

  private estimateTokens(params: ChatParams): number {
    // Rough estimation: 4 chars per token
    let chars = params.systemPrompt?.length ?? 0;
    for (const message of params.messages) {
      chars += message.content.length;
    }
    return Math.ceil(chars / 4) + (params.maxTokens ?? this.defaultMaxTokens);
  }

  private wrapError(error: unknown): Error {
    if (error instanceof Anthropic.APIError) {
      return new LLMAPIError(
        error.message,
        typeof error.status === 'number' ? error.status : undefined,
        'claude',
        error,
      );
    }
    return error as Error;
  }
}
