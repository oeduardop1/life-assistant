/**
 * Tool executor interface for executing tool calls.
 * @module services/tool-executor.service
 */

import type { ToolCall } from '../ports/llm.port.js';

/**
 * Result of a tool execution.
 */
export interface ToolExecutionResult {
  /** Tool call ID (same as input) */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Result content (serialized as string for LLM) */
  content: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Interface for tool executors.
 *
 * Tool executors are responsible for executing tool calls
 * and returning results that can be sent back to the LLM.
 *
 * @example
 * ```typescript
 * class MyToolExecutor implements ToolExecutor {
 *   async execute(toolCall: ToolCall): Promise<ToolExecutionResult> {
 *     switch (toolCall.name) {
 *       case 'search_knowledge':
 *         const results = await this.searchKnowledge(toolCall.arguments);
 *         return {
 *           toolCallId: toolCall.id,
 *           toolName: toolCall.name,
 *           content: JSON.stringify(results),
 *           success: true,
 *         };
 *       default:
 *         return {
 *           toolCallId: toolCall.id,
 *           toolName: toolCall.name,
 *           content: '',
 *           success: false,
 *           error: `Unknown tool: ${toolCall.name}`,
 *         };
 *     }
 *   }
 * }
 * ```
 */
export interface ToolExecutor {
  /**
   * Execute a tool call.
   *
   * @param toolCall - The tool call from the LLM
   * @returns Execution result
   */
  execute(toolCall: ToolCall): Promise<ToolExecutionResult>;

  /**
   * Check if a tool requires user confirmation before execution.
   *
   * @param toolName - Name of the tool
   * @returns True if confirmation is required
   */
  requiresConfirmation(toolName: string): boolean;
}

/**
 * Pending confirmation for a tool call.
 *
 * When a tool requires confirmation, the tool loop will return
 * this object instead of executing the tool.
 */
export interface PendingToolConfirmation {
  /** Tool call that needs confirmation */
  toolCall: ToolCall;
  /** Human-readable description of what the tool will do */
  description: string;
  /** Callback to confirm and execute */
  confirm: () => Promise<ToolExecutionResult>;
  /** Callback to reject the tool call */
  reject: (reason?: string) => ToolExecutionResult;
}

/**
 * Creates a tool execution result from an error.
 *
 * @param toolCall - The tool call that failed
 * @param error - The error that occurred
 * @returns Tool execution result with error
 */
export function createErrorResult(toolCall: ToolCall, error: unknown): ToolExecutionResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content: '',
    success: false,
    error: errorMessage,
  };
}

/**
 * Creates a successful tool execution result.
 *
 * @param toolCall - The tool call that succeeded
 * @param result - The result to return (will be JSON stringified)
 * @returns Tool execution result
 */
export function createSuccessResult(toolCall: ToolCall, result: unknown): ToolExecutionResult {
  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content: typeof result === 'string' ? result : JSON.stringify(result),
    success: true,
  };
}
