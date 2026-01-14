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
  ToolExecutionContext,
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
 *
 * @param llm - LLM adapter to use
 * @param messages - Initial conversation messages
 * @param config - Tool loop configuration
 * @returns Tool loop result
 *
 * @example
 * ```typescript
 * const result = await runToolLoop(llm, messages, {
 *   tools: [searchKnowledgeTool, addKnowledgeTool],
 *   executor: myToolExecutor,
 *   systemPrompt: 'You are a helpful assistant.',
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
      };
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls,
    });

    // Process each tool call - execute directly without confirmation
    for (const toolCall of response.toolCalls) {
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
