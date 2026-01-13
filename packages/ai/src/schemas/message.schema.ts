/**
 * Message and chat parameter schemas.
 * Reference: ENGINEERING.md §8.2
 * @module schemas/message.schema
 */

import { z } from 'zod';
import { toolCallSchema } from './tool.schema.js';

// ============================================================================
// Message Role
// ============================================================================

/**
 * Valid message roles in a conversation.
 */
export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

export type MessageRole = z.infer<typeof messageRoleSchema>;

// ============================================================================
// Message Schema
// ============================================================================

/**
 * Schema for a message in the conversation.
 */
export const messageSchema = z.object({
  /** Role of the message sender */
  role: messageRoleSchema,
  /** Text content of the message */
  content: z.string(),
  /** Tool call ID (for tool result messages) */
  toolCallId: z.string().optional(),
  /** Tool calls made by assistant (for assistant messages) */
  toolCalls: z.array(toolCallSchema).optional(),
});

export type MessageSchema = z.infer<typeof messageSchema>;

// ============================================================================
// Chat Parameters Schema
// ============================================================================

/**
 * Schema for chat completion parameters.
 */
export const chatParamsSchema = z.object({
  /** Conversation messages */
  messages: z.array(messageSchema).min(1),
  /** System prompt/instruction */
  systemPrompt: z.string().optional(),
  /** Temperature for response randomness (0-1) */
  temperature: z.number().min(0).max(1).optional(),
  /** Maximum tokens to generate */
  maxTokens: z.number().positive().optional(),
});

export type ChatParamsSchema = z.infer<typeof chatParamsSchema>;

// ============================================================================
// Tool Choice Schema
// ============================================================================

/**
 * Tool choice mode schema.
 */
export const toolChoiceSchema = z.enum(['auto', 'required', 'none']);

export type ToolChoiceSchema = z.infer<typeof toolChoiceSchema>;

// ============================================================================
// Token Usage Schema
// ============================================================================

/**
 * Schema for token usage statistics.
 */
export const tokenUsageSchema = z.object({
  /** Number of input tokens */
  inputTokens: z.number().nonnegative(),
  /** Number of output tokens */
  outputTokens: z.number().nonnegative(),
});

export type TokenUsageSchema = z.infer<typeof tokenUsageSchema>;

// ============================================================================
// Finish Reason Schema
// ============================================================================

/**
 * Schema for finish reason.
 */
export const finishReasonSchema = z.enum(['stop', 'length', 'tool_calls', 'error']);

export type FinishReasonSchema = z.infer<typeof finishReasonSchema>;

// ============================================================================
// Chat Response Schema
// ============================================================================

/**
 * Schema for chat completion response.
 */
export const chatResponseSchema = z.object({
  /** Generated text content */
  content: z.string(),
  /** Token usage statistics */
  usage: tokenUsageSchema,
  /** Reason for stopping */
  finishReason: finishReasonSchema,
});

export type ChatResponseSchema = z.infer<typeof chatResponseSchema>;

// ============================================================================
// Chat With Tools Response Schema
// ============================================================================

/**
 * Schema for chat completion response with tool calls.
 */
export const chatWithToolsResponseSchema = chatResponseSchema.extend({
  /** Tool calls requested by the LLM */
  toolCalls: z.array(toolCallSchema).optional(),
});

export type ChatWithToolsResponseSchema = z.infer<typeof chatWithToolsResponseSchema>;

// ============================================================================
// Stream Chunk Schema
// ============================================================================

/**
 * Schema for a streamed content chunk.
 */
export const streamChunkSchema = z.object({
  /** Text content in this chunk */
  content: z.string(),
  /** Whether this is the final chunk */
  done: z.boolean(),
  /** Tool calls (sent in final chunk if present) */
  toolCalls: z.array(toolCallSchema).optional(),
});

export type StreamChunkSchema = z.infer<typeof streamChunkSchema>;
