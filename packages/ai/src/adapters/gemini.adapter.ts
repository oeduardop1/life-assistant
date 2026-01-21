/**
 * Gemini adapter for LLM operations.
 * Implements LLMPort interface using Google GenAI SDK.
 * @module adapters/gemini.adapter
 */

import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  FinishReason as GeminiFinishReason,
  type Content,
  type Part,
  type GenerateContentResponse,
} from '@google/genai';
import type {
  LLMPort,
  ChatParams,
  ChatResponse,
  ChatWithToolsParams,
  ChatWithToolsResponse,
  StreamChunk,
  ProviderInfo,
  ToolDefinition,
  ToolCall,
  ToolChoice,
  FinishReason,
  TokenUsage,
} from '../ports/llm.port.js';
import { LLMAPIError, StreamingError } from '../errors/ai.errors.js';
import { type RateLimiter, getRateLimiter } from '../utils/rate-limiter.js';
import { retryWithBackoff } from '../utils/retry.js';
import { zodToGeminiSchema } from '../utils/zod-to-gemini.js';
import { enrichDescriptionWithExamples } from '../utils/examples-enricher.js';

/**
 * Configuration for Gemini adapter.
 */
export interface GeminiAdapterConfig {
  /** Google API key */
  apiKey: string;
  /** Model to use (e.g., 'gemini-2.5-flash') */
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
const SDK_VERSION = '1.35.0';

/**
 * Gemini adapter implementing LLMPort interface.
 *
 * @example
 * ```typescript
 * const gemini = new GeminiAdapter({
 *   apiKey: process.env.GEMINI_API_KEY!,
 *   model: 'gemini-2.5-flash',
 * });
 *
 * const response = await gemini.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export class GeminiAdapter implements LLMPort {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly rateLimiter: RateLimiter | null;
  private readonly enableRetries: boolean;

  constructor(config: GeminiAdapterConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
    this.rateLimiter = config.enableRateLimiting !== false
      ? getRateLimiter('gemini')
      : null;
    this.enableRetries = config.enableRetries !== false;
  }

  /**
   * Send a chat completion request.
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const execute = async () => {
      await this.rateLimiter?.checkAndWait(this.estimateTokens(params));

      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: this.buildContents(params),
          config: {
            maxOutputTokens: params.maxTokens ?? this.defaultMaxTokens,
            ...(params.temperature !== undefined && { temperature: params.temperature }),
            ...(params.systemPrompt && { systemInstruction: params.systemPrompt }),
          },
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
        const functionDeclarations = params.tools.map((tool) =>
          this.convertTool(tool),
        );

        const toolChoiceConfig = this.mapToolChoice(params.toolChoice);

        const response = await this.client.models.generateContent({
          model: this.model,
          contents: this.buildContents(params),
          config: {
            maxOutputTokens: params.maxTokens ?? this.defaultMaxTokens,
            ...(params.temperature !== undefined && { temperature: params.temperature }),
            ...(params.systemPrompt && { systemInstruction: params.systemPrompt }),
            tools: [{ functionDeclarations }],
            toolConfig: {
              functionCallingConfig: {
                mode: toolChoiceConfig.mode,
                ...(toolChoiceConfig.allowedFunctionNames && {
                  allowedFunctionNames: toolChoiceConfig.allowedFunctionNames,
                }),
              },
            },
          },
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
      const responseStream = await this.client.models.generateContentStream({
        model: this.model,
        contents: this.buildContents(params),
        config: {
          maxOutputTokens: params.maxTokens ?? this.defaultMaxTokens,
          ...(params.temperature !== undefined && { temperature: params.temperature }),
          ...(params.systemPrompt && { systemInstruction: params.systemPrompt }),
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          yield { content: text, done: false };
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
      const functionDeclarations = params.tools.map((tool) =>
        this.convertTool(tool),
      );

      const toolChoiceConfig = this.mapToolChoice(params.toolChoice);

      const responseStream = await this.client.models.generateContentStream({
        model: this.model,
        contents: this.buildContents(params),
        config: {
          maxOutputTokens: params.maxTokens ?? this.defaultMaxTokens,
          ...(params.temperature !== undefined && { temperature: params.temperature }),
          ...(params.systemPrompt && { systemInstruction: params.systemPrompt }),
          tools: [{ functionDeclarations }],
          toolConfig: {
            functionCallingConfig: {
              mode: toolChoiceConfig.mode,
              ...(toolChoiceConfig.allowedFunctionNames && {
                allowedFunctionNames: toolChoiceConfig.allowedFunctionNames,
              }),
            },
          },
        },
      });

      const toolCalls: ToolCall[] = [];
      let callId = 0;

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          yield { content: text, done: false };
        }

        // Check for function calls
        const functionCalls = chunk.functionCalls;
        if (functionCalls) {
          for (const fc of functionCalls) {
            toolCalls.push({
              id: `call_${String(callId++)}`,
              name: fc.name ?? '',
              arguments: fc.args ?? {},
            });
          }
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
      name: 'gemini',
      model: this.model,
      version: SDK_VERSION,
      supportsToolUse: true,
      supportsStreaming: true,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildContents(params: ChatParams): Content[] {
    const contents: Content[] = [];

    for (const message of params.messages) {
      if (message.role === 'system') {
        // System messages are passed via config.systemInstruction
        continue;
      }

      if (message.role === 'tool') {
        // Tool results are sent as function responses
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: message.toolCallId ?? 'unknown',
                response: { result: this.parseJson(message.content) },
              },
            },
          ],
        });
        continue;
      }

      if (message.role === 'assistant' && message.toolCalls?.length) {
        // Assistant with tool calls
        const parts: Part[] = [];
        if (message.content) {
          parts.push({ text: message.content });
        }
        for (const toolCall of message.toolCalls) {
          parts.push({
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments,
            },
          });
        }
        contents.push({ role: 'model', parts });
        continue;
      }

      // Regular message
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      });
    }

    return contents;
  }

  private convertTool(tool: ToolDefinition): {
    name: string;
    description: string;
    parameters: ReturnType<typeof zodToGeminiSchema>;
  } {
    // Gemini doesn't support inputExamples natively, so we enrich the description
    const enrichedDescription = enrichDescriptionWithExamples(
      tool.description,
      tool.inputExamples,
    );

    return {
      name: tool.name,
      description: enrichedDescription,
      parameters: zodToGeminiSchema(tool.parameters),
    };
  }

  private mapToolChoice(choice?: ToolChoice): {
    mode: FunctionCallingConfigMode;
    allowedFunctionNames?: string[];
  } {
    // Force specific tool
    if (typeof choice === 'object') {
      return {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: [choice.toolName],
      };
    }

    // String modes
    switch (choice) {
      case 'required':
        return { mode: FunctionCallingConfigMode.ANY };
      case 'none':
        return { mode: FunctionCallingConfigMode.NONE };
      default:
        return { mode: FunctionCallingConfigMode.AUTO };
    }
  }

  private mapResponse(response: GenerateContentResponse): ChatResponse {
    return {
      content: response.text ?? '',
      usage: this.extractUsage(response),
      finishReason: this.mapFinishReason(response),
    };
  }

  private mapToolResponse(response: GenerateContentResponse): ChatWithToolsResponse {
    const functionCalls = response.functionCalls;
    const toolCalls: ToolCall[] = [];

    if (functionCalls && functionCalls.length > 0) {
      for (const [index, fc] of functionCalls.entries()) {
        toolCalls.push({
          id: `call_${String(index)}`,
          name: fc.name ?? '',
          arguments: fc.args ?? {},
        });
      }
    }

    return {
      content: response.text ?? '',
      usage: this.extractUsage(response),
      finishReason: this.mapFinishReason(response),
      ...(toolCalls.length > 0 && { toolCalls }),
    };
  }

  private extractUsage(response: GenerateContentResponse): TokenUsage {
    const metadata = response.usageMetadata;
    return {
      inputTokens: metadata?.promptTokenCount ?? 0,
      outputTokens: metadata?.candidatesTokenCount ?? 0,
    };
  }

  private mapFinishReason(response: GenerateContentResponse): FinishReason {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      return 'stop';
    }

    // Check if there are function calls
    if (response.functionCalls?.length) {
      return 'tool_calls';
    }

    const reason = candidate.finishReason;
    switch (reason) {
      case GeminiFinishReason.STOP:
        return 'stop';
      case GeminiFinishReason.MAX_TOKENS:
        return 'length';
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

  private parseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  private wrapError(error: unknown): Error {
    if (error instanceof Error) {
      return new LLMAPIError(
        error.message,
        undefined,
        'gemini',
        error,
      );
    }
    return new LLMAPIError(String(error), undefined, 'gemini');
  }
}
