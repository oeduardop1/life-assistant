/**
 * Tool definition schemas for LLM Tool Use.
 * Reference: AI_SPECS.md §6.2
 * @module schemas/tool.schema
 */

import { z } from 'zod';

// ============================================================================
// Tool Definition Schema
// ============================================================================

/**
 * Schema for validating tool names.
 * Must be lowercase snake_case, starting with a letter.
 */
export const toolNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Tool name must be lowercase snake_case');

/**
 * Schema for tool definition metadata.
 * Note: The actual ToolDefinition interface uses Zod schemas for parameters,
 * this schema is for serialized/external tool definitions.
 */
export const toolDefinitionMetaSchema = z.object({
  name: toolNameSchema,
  description: z.string().min(1).max(1024),
  requiresConfirmation: z.boolean().default(false),
});

export type ToolDefinitionMeta = z.infer<typeof toolDefinitionMetaSchema>;

// ============================================================================
// Tool Call Schema
// ============================================================================

/**
 * Schema for a tool call from the LLM.
 */
export const toolCallSchema = z.object({
  /** Unique ID for this tool call */
  id: z.string().min(1),
  /** Name of the tool to call */
  name: toolNameSchema,
  /** Arguments to pass to the tool */
  arguments: z.record(z.unknown()),
});

export type ToolCallSchema = z.infer<typeof toolCallSchema>;

// ============================================================================
// Tool Result Schema
// ============================================================================

/**
 * Schema for the result of a tool execution.
 */
export const toolResultSchema = z.object({
  /** Whether the tool executed successfully */
  success: z.boolean(),
  /** Result data (if successful) */
  data: z.unknown().optional(),
  /** Error message (if failed) */
  error: z.string().optional(),
});

export type ToolResultSchema = z.infer<typeof toolResultSchema>;

// ============================================================================
// Tool Execution Context
// ============================================================================

/**
 * Schema for tool execution context.
 */
export const toolExecutionContextSchema = z.object({
  /** User ID for multi-tenant context */
  userId: z.string().uuid(),
  /** Conversation ID */
  conversationId: z.string().uuid().optional(),
});

export type ToolExecutionContext = z.infer<typeof toolExecutionContextSchema>;
