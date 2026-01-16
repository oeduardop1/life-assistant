/**
 * LLM Port Interface - Abstracts LLM providers (Gemini, Claude).
 * Reference: docs/specs/engineering.md §8.2
 * @module ports/llm.port
 */

import type { z } from 'zod';

// ============================================================================
// Message Types
// ============================================================================

/**
 * Role of a message in the conversation.
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * A message in the conversation.
 */
export interface Message {
  /** Role of the message sender */
  role: MessageRole;
  /** Text content of the message */
  content: string;
  /** Tool call ID (for tool result messages) */
  toolCallId?: string;
  /** Tool calls made by assistant (for assistant messages) */
  toolCalls?: ToolCall[];
}

// ============================================================================
// Chat Parameters & Response
// ============================================================================

/**
 * Parameters for a chat completion request.
 */
export interface ChatParams {
  /** Conversation messages */
  messages: Message[];
  /** System prompt/instruction */
  systemPrompt?: string;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Token usage statistics.
 */
export interface TokenUsage {
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
}

/**
 * Reason why the model stopped generating.
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'error';

/**
 * Response from a chat completion request.
 */
export interface ChatResponse {
  /** Generated text content */
  content: string;
  /** Token usage statistics */
  usage: TokenUsage;
  /** Reason for stopping */
  finishReason: FinishReason;
}

// ============================================================================
// Tool Use Types
// ============================================================================

/**
 * Definition of a tool that the LLM can call.
 * @template T - Zod schema type for parameters
 */
export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  /** Unique tool name (snake_case) */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** Zod schema for tool parameters */
  parameters: T;
  /** Whether user confirmation is required before execution */
  requiresConfirmation?: boolean;
  /** Input examples for improved accuracy (2-4 examples) */
  inputExamples?: z.infer<T>[];
}

/**
 * A tool call requested by the LLM.
 */
export interface ToolCall {
  /** Unique ID for this tool call */
  id: string;
  /** Name of the tool to call */
  name: string;
  /** Arguments to pass to the tool */
  arguments: Record<string, unknown>;
}

/**
 * Tool choice mode.
 */
export type ToolChoice = 'auto' | 'required' | 'none';

/**
 * Parameters for a chat completion with tools.
 */
export interface ChatWithToolsParams extends ChatParams {
  /** Available tools for the LLM to use */
  tools: ToolDefinition[];
  /** Tool choice mode */
  toolChoice?: ToolChoice;
}

/**
 * Response from a chat completion with tools.
 */
export interface ChatWithToolsResponse extends ChatResponse {
  /** Tool calls requested by the LLM */
  toolCalls?: ToolCall[];
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * A chunk of streamed content.
 */
export interface StreamChunk {
  /** Text content in this chunk */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Tool calls (sent in final chunk if present) */
  toolCalls?: ToolCall[];
}

// ============================================================================
// Provider Info
// ============================================================================

/**
 * LLM provider identifier.
 */
export type LLMProviderName = 'gemini' | 'claude';

/**
 * Information about the LLM provider.
 */
export interface ProviderInfo {
  /** Provider name */
  name: LLMProviderName;
  /** Model being used */
  model: string;
  /** SDK version */
  version: string;
  /** Whether provider supports tool use */
  supportsToolUse: boolean;
  /** Whether provider supports streaming */
  supportsStreaming: boolean;
}

// ============================================================================
// LLM Port Interface
// ============================================================================

/**
 * Port interface for LLM providers.
 * Abstracts Gemini and Claude behind a common interface.
 *
 * @example
 * ```typescript
 * const llm: LLMPort = createLLMFromEnv();
 *
 * // Basic chat
 * const response = await llm.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // Chat with tools
 * const toolResponse = await llm.chatWithTools({
 *   messages: [{ role: 'user', content: 'Record my weight: 82kg' }],
 *   tools: [recordMetricTool],
 * });
 *
 * // Streaming
 * for await (const chunk of llm.stream({ messages })) {
 *   process.stdout.write(chunk.content);
 * }
 * ```
 */
export interface LLMPort {
  /**
   * Send a chat completion request.
   * @param params - Chat parameters
   * @returns Chat response with generated content
   */
  chat(params: ChatParams): Promise<ChatResponse>;

  /**
   * Send a chat completion request with tool use support.
   * @param params - Chat parameters with tools
   * @returns Chat response with optional tool calls
   */
  chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse>;

  /**
   * Send a streaming chat completion request.
   * @param params - Chat parameters
   * @returns Async iterable of stream chunks
   */
  stream(params: ChatParams): AsyncIterable<StreamChunk>;

  /**
   * Send a streaming chat completion request with tool use support.
   * @param params - Chat parameters with tools
   * @returns Async iterable of stream chunks
   */
  streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk>;

  /**
   * Get information about the LLM provider.
   * @returns Provider information
   */
  getInfo(): ProviderInfo;
}
