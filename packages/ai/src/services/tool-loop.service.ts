/**
 * Tool loop service for orchestrating LLM conversations with tool use.
 * @module services/tool-loop.service
 * @see ADR-015 for Low Friction Tracking Philosophy (pendingConfirmation)
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
  ToolExecutionContext,
} from './tool-executor.service.js';
import { createErrorResult, createSuccessResult } from './tool-executor.service.js';
import { MaxIterationsExceededError, ToolNotFoundError } from '../errors/ai.errors.js';

/**
 * Pending confirmation state for tools that require user confirmation.
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export interface PendingConfirmation {
  /** Tool call that needs confirmation */
  toolCall: ToolCall;
  /** Tool definition (for access to metadata) */
  toolDefinition: ToolDefinition;
  /** Current iteration number */
  iteration: number;
  /** Messages up to this point (for resuming) */
  messages: Message[];
  /** All tool calls made before this one */
  previousToolCalls: ToolCall[];
  /** All tool results before this one */
  previousToolResults: ToolExecutionResult[];
}

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
  /** Context for tool execution (userId, conversationId) */
  context: ToolExecutionContext;
  /** System prompt for the LLM */
  systemPrompt?: string;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Max tokens for LLM responses */
  maxTokens?: number;
  /** Callback for each iteration (useful for logging/debugging) */
  onIteration?: (iteration: number, response: ChatWithToolsResponse) => void;
  /** Skip confirmation check (for resuming after confirmation) */
  skipConfirmationFor?: string;
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
  /** Pending confirmation if loop paused for user confirmation */
  pendingConfirmation?: PendingConfirmation;
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
 * 2. A tool requires confirmation (returns pendingConfirmation)
 * 3. Max iterations reached (throws MaxIterationsExceededError)
 *
 * @param llm - LLM adapter to use
 * @param messages - Initial conversation messages
 * @param config - Tool loop configuration
 * @returns Tool loop result (may include pendingConfirmation)
 *
 * @see ADR-015 for Low Friction Tracking Philosophy (pendingConfirmation)
 *
 * @example
 * ```typescript
 * const result = await runToolLoop(llm, messages, {
 *   tools: [searchKnowledgeTool, recordMetricTool],
 *   executor: myToolExecutor,
 *   systemPrompt: 'You are a helpful assistant.',
 * });
 *
 * if (result.pendingConfirmation) {
 *   // Tool requires user confirmation before execution
 *   console.log('Awaiting confirmation for:', result.pendingConfirmation.toolCall.name);
 * } else {
 *   console.log(result.content);
 * }
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

  // Create a map of tool definitions for quick lookup
  const toolDefinitionMap = new Map<string, ToolDefinition>(
    config.tools.map((tool) => [tool.name, tool])
  );

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
      const toolDefinition = toolDefinitionMap.get(toolCall.name);

      // Check if tool requires confirmation (ADR-015)
      // Skip confirmation check if this tool was already confirmed
      const shouldSkipConfirmation = config.skipConfirmationFor === toolCall.id;

      if (
        toolDefinition?.requiresConfirmation === true &&
        !shouldSkipConfirmation
      ) {
        // Return pending confirmation - loop pauses here
        // The caller is responsible for:
        // 1. Storing this state
        // 2. Asking user for confirmation
        // 3. Resuming the loop with confirmed/rejected tool call
        return {
          content: response.content,
          iterations: iteration,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
          messages,
          pendingConfirmation: {
            toolCall,
            toolDefinition,
            iteration,
            messages: [...messages],
            previousToolCalls: [...allToolCalls],
            previousToolResults: [...allToolResults],
          },
        };
      }

      // Execute tool (either doesn't require confirmation or was confirmed)
      allToolCalls.push(toolCall);

      const result = await executeToolCall(config.executor, toolCall, config.context);
      allToolResults.push(result);

      // Add tool result to messages
      messages.push({
        role: 'tool',
        content: result.success ? result.content : `Error: ${result.error ?? 'Unknown error'}`,
        toolCallId: toolCall.id,
      });
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
  toolCall: ToolCall,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    return await executor.execute(toolCall, context);
  } catch (error) {
    return createErrorResult(toolCall, error);
  }
}

/**
 * Creates a simple tool executor from a map of handlers.
 *
 * @param handlers - Map of tool name to handler function
 * @returns Tool executor instance
 *
 * @example
 * ```typescript
 * const executor = createSimpleExecutor({
 *   search_knowledge: async (args) => {
 *     const results = await db.search(args.query);
 *     return results;
 *   },
 *   add_knowledge: async (args) => {
 *     await db.addKnowledge(args);
 *     return { success: true };
 *   },
 * });
 * ```
 */
export function createSimpleExecutor(
  handlers: Record<string, (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>>
): ToolExecutor {
  return {
    async execute(toolCall: ToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const handler = handlers[toolCall.name];

      if (!handler) {
        throw new ToolNotFoundError(toolCall.name);
      }

      try {
        const result = await handler(toolCall.arguments, context);
        return createSuccessResult(toolCall, result);
      } catch (error) {
        return createErrorResult(toolCall, error);
      }
    },
  };
}
