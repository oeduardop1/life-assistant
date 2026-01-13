/**
 * Tool loop service for orchestrating LLM conversations with tool use.
 * @module services/tool-loop.service
 */

import type {
  LLMPort,
  Message,
  ToolDefinition,
  ChatWithToolsResponse,
  ToolCall,
} from '../ports/llm.port.js';
import type {
  ToolExecutor,
  ToolExecutionResult,
  PendingToolConfirmation,
} from './tool-executor.service.js';
import { createErrorResult, createSuccessResult } from './tool-executor.service.js';
import { MaxIterationsExceededError, ToolNotFoundError } from '../errors/ai.errors.js';

/**
 * Configuration for the tool loop.
 */
export interface ToolLoopConfig {
  /** Maximum number of iterations (default: 5) */
  maxIterations?: number;
  /** Available tools */
  tools: ToolDefinition[];
  /** Tool executor instance */
  executor: ToolExecutor;
  /** System prompt for the LLM */
  systemPrompt?: string;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Max tokens for LLM responses */
  maxTokens?: number;
  /** Callback when a tool requires confirmation */
  onConfirmationRequired?: (
    confirmation: PendingToolConfirmation
  ) => Promise<boolean>;
  /** Callback for each iteration (useful for logging/debugging) */
  onIteration?: (iteration: number, response: ChatWithToolsResponse) => void;
}

/**
 * Result of a tool loop execution.
 */
export interface ToolLoopResult {
  /** Final response content from the LLM */
  content: string;
  /** Number of iterations used */
  iterations: number;
  /** All tool calls made during the loop */
  toolCalls: ToolCall[];
  /** All tool results */
  toolResults: ToolExecutionResult[];
  /** Final conversation messages */
  messages: Message[];
  /** Whether loop completed (vs pending confirmation) */
  completed: boolean;
  /** Pending confirmation if loop stopped for user confirmation */
  pendingConfirmation?: PendingToolConfirmation;
}

/**
 * Default maximum iterations for the tool loop.
 */
export const DEFAULT_MAX_ITERATIONS = 5;

/**
 * Runs a conversation loop with tool use.
 *
 * The loop continues until:
 * 1. The LLM responds without tool calls (completed)
 * 2. Max iterations reached (throws MaxIterationsExceededError)
 * 3. A tool requires confirmation (returns with pendingConfirmation)
 *
 * @param llm - LLM adapter to use
 * @param messages - Initial conversation messages
 * @param config - Tool loop configuration
 * @returns Tool loop result
 *
 * @example
 * ```typescript
 * const result = await runToolLoop(llm, messages, {
 *   tools: [searchKnowledgeTool, recordMetricTool],
 *   executor: myToolExecutor,
 *   systemPrompt: 'You are a helpful assistant.',
 *   onConfirmationRequired: async (confirmation) => {
 *     // Show confirmation UI to user
 *     return await showConfirmationDialog(confirmation.description);
 *   },
 * });
 *
 * console.log(result.content);
 * ```
 */
export async function runToolLoop(
  llm: LLMPort,
  initialMessages: Message[],
  config: ToolLoopConfig
): Promise<ToolLoopResult> {
  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const messages: Message[] = [...initialMessages];
  const allToolCalls: ToolCall[] = [];
  const allToolResults: ToolExecutionResult[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // Call LLM with tools
    const response = await llm.chatWithTools({
      messages,
      tools: config.tools,
      ...(config.systemPrompt && { systemPrompt: config.systemPrompt }),
      ...(config.temperature !== undefined && { temperature: config.temperature }),
      ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    });

    // Call iteration callback
    config.onIteration?.(iteration, response);

    // If no tool calls, we're done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        content: response.content,
        iterations: iteration,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        messages,
        completed: true,
      };
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls,
    });

    // Process each tool call
    for (const toolCall of response.toolCalls) {
      allToolCalls.push(toolCall);

      // Check if tool requires confirmation
      if (config.executor.requiresConfirmation(toolCall.name)) {
        // Create pending confirmation
        const pendingConfirmation: PendingToolConfirmation = {
          toolCall,
          description: formatToolCallDescription(toolCall),
          confirm: async () => {
            const result = await executeToolCall(config.executor, toolCall);
            allToolResults.push(result);
            return result;
          },
          reject: (reason?: string) => {
            const result: ToolExecutionResult = {
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              content: '',
              success: false,
              error: reason ?? 'User rejected the tool call',
            };
            allToolResults.push(result);
            return result;
          },
        };

        // If callback is provided, ask for confirmation
        if (config.onConfirmationRequired) {
          const confirmed = await config.onConfirmationRequired(pendingConfirmation);

          if (confirmed) {
            const result = await pendingConfirmation.confirm();
            messages.push({
              role: 'tool',
              content: result.success ? result.content : `Error: ${result.error ?? 'Unknown error'}`,
              toolCallId: toolCall.id,
            });
          } else {
            const result = pendingConfirmation.reject();
            messages.push({
              role: 'tool',
              content: `Tool call rejected: ${result.error ?? 'User rejected'}`,
              toolCallId: toolCall.id,
            });
          }
        } else {
          // No callback, return pending confirmation
          return {
            content: response.content,
            iterations: iteration,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            messages,
            completed: false,
            pendingConfirmation,
          };
        }
      } else {
        // Execute tool without confirmation
        const result = await executeToolCall(config.executor, toolCall);
        allToolResults.push(result);

        // Add tool result to messages
        messages.push({
          role: 'tool',
          content: result.success ? result.content : `Error: ${result.error ?? 'Unknown error'}`,
          toolCallId: toolCall.id,
        });
      }
    }
  }

  // Max iterations reached
  throw new MaxIterationsExceededError(maxIterations);
}

/**
 * Executes a single tool call.
 */
async function executeToolCall(
  executor: ToolExecutor,
  toolCall: ToolCall
): Promise<ToolExecutionResult> {
  try {
    return await executor.execute(toolCall);
  } catch (error) {
    return createErrorResult(toolCall, error);
  }
}

/**
 * Formats a tool call into a human-readable description.
 */
function formatToolCallDescription(toolCall: ToolCall): string {
  const args = JSON.stringify(toolCall.arguments, null, 2);
  return `Tool: ${toolCall.name}\nArguments:\n${args}`;
}

/**
 * Continues a tool loop after user confirmation.
 *
 * Use this to resume a loop that was paused for confirmation.
 *
 * @param llm - LLM adapter to use
 * @param previousResult - Previous tool loop result with pending confirmation
 * @param confirmed - Whether user confirmed the tool call
 * @param config - Tool loop configuration (same as original call)
 * @returns Updated tool loop result
 */
export async function continueToolLoop(
  llm: LLMPort,
  previousResult: ToolLoopResult,
  confirmed: boolean,
  config: ToolLoopConfig
): Promise<ToolLoopResult> {
  if (!previousResult.pendingConfirmation) {
    throw new Error('No pending confirmation to continue');
  }

  const { pendingConfirmation } = previousResult;
  const messages = [...previousResult.messages];

  // Execute or reject the pending tool call
  let result: ToolExecutionResult;
  if (confirmed) {
    result = await pendingConfirmation.confirm();
  } else {
    result = pendingConfirmation.reject();
  }

  // Add tool result to messages
  messages.push({
    role: 'tool',
    content: result.success ? result.content : `Error: ${result.error ?? 'Unknown error'}`,
    toolCallId: pendingConfirmation.toolCall.id,
  });

  // Continue the loop
  return runToolLoop(llm, messages, {
    ...config,
    // Reduce max iterations by what we've already used
    maxIterations: (config.maxIterations ?? DEFAULT_MAX_ITERATIONS) - previousResult.iterations,
  });
}

/**
 * Creates a simple tool executor from a map of handlers.
 *
 * @param handlers - Map of tool name to handler function
 * @param confirmationTools - Set of tool names that require confirmation
 * @returns Tool executor instance
 *
 * @example
 * ```typescript
 * const executor = createSimpleExecutor({
 *   search_knowledge: async (args) => {
 *     const results = await db.search(args.query);
 *     return results;
 *   },
 *   record_metric: async (args) => {
 *     await db.recordMetric(args);
 *     return { success: true };
 *   },
 * }, new Set(['record_metric']));
 * ```
 */
export function createSimpleExecutor(
  handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>,
  confirmationTools = new Set<string>()
): ToolExecutor {
  return {
    async execute(toolCall: ToolCall): Promise<ToolExecutionResult> {
      const handler = handlers[toolCall.name];

      if (!handler) {
        throw new ToolNotFoundError(toolCall.name);
      }

      try {
        const result = await handler(toolCall.arguments);
        return createSuccessResult(toolCall, result);
      } catch (error) {
        return createErrorResult(toolCall, error);
      }
    },

    requiresConfirmation(toolName: string): boolean {
      return confirmationTools.has(toolName);
    },
  };
}
