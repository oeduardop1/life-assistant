/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runToolLoop,
  continueToolLoop,
  createSimpleExecutor,
  DEFAULT_MAX_ITERATIONS,
} from './tool-loop.service.js';
import type { LLMPort, Message, ChatWithToolsResponse, ToolDefinition } from '../ports/llm.port.js';
import type { ToolExecutor, ToolExecutionResult } from './tool-executor.service.js';
import { MaxIterationsExceededError, ToolNotFoundError } from '../errors/ai.errors.js';
import { z } from 'zod';

describe('tool-loop.service', () => {
  // Mock LLM
  const createMockLLM = (): LLMPort => ({
    chat: vi.fn(),
    chatWithTools: vi.fn(),
    stream: vi.fn(),
    streamWithTools: vi.fn(),
    getInfo: vi.fn(() => ({ name: 'test', model: 'test-model', version: '1.0', supportsToolUse: true, supportsStreaming: true })),
  });

  // Mock executor
  const createMockExecutor = (): ToolExecutor => ({
    execute: vi.fn(),
    requiresConfirmation: vi.fn(() => false),
  });

  // Sample tool definition
  const testTool: ToolDefinition = {
    name: 'test_tool',
    description: 'A test tool',
    parameters: z.object({ query: z.string() }),
  };

  describe('runToolLoop', () => {
    let mockLLM: LLMPort;
    let mockExecutor: ToolExecutor;

    beforeEach(() => {
      mockLLM = createMockLLM();
      mockExecutor = createMockExecutor();
    });

    it('should complete immediately when LLM returns no tool calls', async () => {
      const response: ChatWithToolsResponse = {
        content: 'Hello, I can help you!',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      };
      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Hi' }], {
        tools: [testTool],
        executor: mockExecutor,
      });

      expect(result.completed).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.content).toBe('Hello, I can help you!');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should execute tool calls and continue loop', async () => {
      // First response with tool call
      const response1: ChatWithToolsResponse = {
        content: 'Let me search for that...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'test_tool', arguments: { query: 'test' } }],
      };
      // Second response without tool calls
      const response2: ChatWithToolsResponse = {
        content: 'Here are the results.',
        usage: { inputTokens: 30, outputTokens: 40 },
        finishReason: 'stop',
      };

      vi.mocked(mockLLM.chatWithTools)
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
        toolCallId: 'call_1',
        toolName: 'test_tool',
        content: '{"results": []}',
        success: true,
      });

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Search' }], {
        tools: [testTool],
        executor: mockExecutor,
      });

      expect(result.completed).toBe(true);
      expect(result.iterations).toBe(2);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolResults).toHaveLength(1);
    });

    it('should throw MaxIterationsExceededError when limit reached', async () => {
      const responseWithTools: ChatWithToolsResponse = {
        content: 'Calling tool...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'test_tool', arguments: { query: 'test' } }],
      };

      vi.mocked(mockLLM.chatWithTools).mockResolvedValue(responseWithTools);
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        toolCallId: 'call_1',
        toolName: 'test_tool',
        content: 'result',
        success: true,
      });

      await expect(
        runToolLoop(mockLLM, [{ role: 'user', content: 'Test' }], {
          tools: [testTool],
          executor: mockExecutor,
          maxIterations: 2,
        })
      ).rejects.toThrow(MaxIterationsExceededError);
    });

    it('should call onIteration callback for each iteration', async () => {
      const response: ChatWithToolsResponse = {
        content: 'Done!',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      };
      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

      const onIteration = vi.fn();

      await runToolLoop(mockLLM, [{ role: 'user', content: 'Hi' }], {
        tools: [testTool],
        executor: mockExecutor,
        onIteration,
      });

      expect(onIteration).toHaveBeenCalledTimes(1);
      expect(onIteration).toHaveBeenCalledWith(1, response);
    });

    it('should add error message when tool execution fails', async () => {
      const response1: ChatWithToolsResponse = {
        content: 'Calling tool...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'test_tool', arguments: { query: 'test' } }],
      };
      const response2: ChatWithToolsResponse = {
        content: 'I see the tool failed.',
        usage: { inputTokens: 30, outputTokens: 40 },
        finishReason: 'stop',
      };

      vi.mocked(mockLLM.chatWithTools)
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
        toolCallId: 'call_1',
        toolName: 'test_tool',
        content: '',
        success: false,
        error: 'Database error',
      });

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Search' }], {
        tools: [testTool],
        executor: mockExecutor,
      });

      expect(result.completed).toBe(true);
      // Check that error was passed to LLM
      const secondCall = vi.mocked(mockLLM.chatWithTools).mock.calls[1];
      const messages = secondCall?.[0].messages;
      const toolMessage = messages?.find((m: Message) => m.role === 'tool');
      expect(toolMessage?.content).toContain('Error: Database error');
    });

    it('should return pending confirmation when tool requires confirmation and no callback', async () => {
      const response: ChatWithToolsResponse = {
        content: 'I need to record this metric.',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'record_metric', arguments: { value: 100 } }],
      };

      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);
      vi.mocked(mockExecutor.requiresConfirmation).mockReturnValueOnce(true);

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Record' }], {
        tools: [testTool],
        executor: mockExecutor,
      });

      expect(result.completed).toBe(false);
      expect(result.pendingConfirmation).toBeDefined();
      expect(result.pendingConfirmation?.toolCall.name).toBe('record_metric');
    });

    it('should execute tool when confirmation callback approves', async () => {
      const response1: ChatWithToolsResponse = {
        content: 'Recording metric...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'record_metric', arguments: { value: 100 } }],
      };
      const response2: ChatWithToolsResponse = {
        content: 'Metric recorded!',
        usage: { inputTokens: 30, outputTokens: 40 },
        finishReason: 'stop',
      };

      vi.mocked(mockLLM.chatWithTools)
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      vi.mocked(mockExecutor.requiresConfirmation).mockReturnValueOnce(true);
      vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
        toolCallId: 'call_1',
        toolName: 'record_metric',
        content: '{"success": true}',
        success: true,
      });

      const onConfirmationRequired = vi.fn().mockResolvedValueOnce(true);

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Record' }], {
        tools: [testTool],
        executor: mockExecutor,
        onConfirmationRequired,
      });

      expect(result.completed).toBe(true);
      expect(onConfirmationRequired).toHaveBeenCalledTimes(1);
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should reject tool when confirmation callback denies', async () => {
      const response1: ChatWithToolsResponse = {
        content: 'Recording metric...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_1', name: 'record_metric', arguments: { value: 100 } }],
      };
      const response2: ChatWithToolsResponse = {
        content: 'OK, I wont record that.',
        usage: { inputTokens: 30, outputTokens: 40 },
        finishReason: 'stop',
      };

      vi.mocked(mockLLM.chatWithTools)
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      vi.mocked(mockExecutor.requiresConfirmation).mockReturnValueOnce(true);

      const onConfirmationRequired = vi.fn().mockResolvedValueOnce(false);

      const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Record' }], {
        tools: [testTool],
        executor: mockExecutor,
        onConfirmationRequired,
      });

      expect(result.completed).toBe(true);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
    });

    it('should use default max iterations of 5', () => {
      expect(DEFAULT_MAX_ITERATIONS).toBe(5);
    });

    it('should pass system prompt and temperature to LLM', async () => {
      const response: ChatWithToolsResponse = {
        content: 'Done',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      };
      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

      await runToolLoop(mockLLM, [{ role: 'user', content: 'Hi' }], {
        tools: [testTool],
        executor: mockExecutor,
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(mockLLM.chatWithTools).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are helpful',
          temperature: 0.7,
          maxTokens: 1000,
        })
      );
    });
  });

  describe('continueToolLoop', () => {
    let mockLLM: LLMPort;
    let mockExecutor: ToolExecutor;

    beforeEach(() => {
      mockLLM = createMockLLM();
      mockExecutor = createMockExecutor();
    });

    it('should throw error when no pending confirmation', async () => {
      const previousResult = {
        content: 'Done',
        iterations: 1,
        toolCalls: [],
        toolResults: [],
        messages: [],
        completed: true,
      };

      await expect(
        continueToolLoop(mockLLM, previousResult, true, {
          tools: [testTool],
          executor: mockExecutor,
        })
      ).rejects.toThrow('No pending confirmation to continue');
    });

    it('should execute pending tool when confirmed', async () => {
      const toolResult: ToolExecutionResult = {
        toolCallId: 'call_1',
        toolName: 'record_metric',
        content: '{"success": true}',
        success: true,
      };

      const pendingConfirmation = {
        toolCall: { id: 'call_1', name: 'record_metric', arguments: { value: 100 } },
        description: 'Record metric',
        confirm: vi.fn().mockResolvedValueOnce(toolResult),
        reject: vi.fn(),
      };

      const previousResult = {
        content: 'Recording...',
        iterations: 1,
        toolCalls: [{ id: 'call_1', name: 'record_metric', arguments: { value: 100 } }],
        toolResults: [],
        messages: [{ role: 'user' as const, content: 'Record' }],
        completed: false,
        pendingConfirmation,
      };

      const response: ChatWithToolsResponse = {
        content: 'Done!',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      };
      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

      const result = await continueToolLoop(mockLLM, previousResult, true, {
        tools: [testTool],
        executor: mockExecutor,
        maxIterations: 5,
      });

      expect(pendingConfirmation.confirm).toHaveBeenCalled();
      expect(pendingConfirmation.reject).not.toHaveBeenCalled();
      expect(result.completed).toBe(true);
    });

    it('should reject pending tool when not confirmed', async () => {
      const rejectResult: ToolExecutionResult = {
        toolCallId: 'call_1',
        toolName: 'record_metric',
        content: '',
        success: false,
        error: 'User rejected the tool call',
      };

      const pendingConfirmation = {
        toolCall: { id: 'call_1', name: 'record_metric', arguments: { value: 100 } },
        description: 'Record metric',
        confirm: vi.fn(),
        reject: vi.fn().mockReturnValueOnce(rejectResult),
      };

      const previousResult = {
        content: 'Recording...',
        iterations: 1,
        toolCalls: [{ id: 'call_1', name: 'record_metric', arguments: { value: 100 } }],
        toolResults: [],
        messages: [{ role: 'user' as const, content: 'Record' }],
        completed: false,
        pendingConfirmation,
      };

      const response: ChatWithToolsResponse = {
        content: 'OK, cancelled.',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      };
      vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

      const result = await continueToolLoop(mockLLM, previousResult, false, {
        tools: [testTool],
        executor: mockExecutor,
        maxIterations: 5,
      });

      expect(pendingConfirmation.reject).toHaveBeenCalled();
      expect(pendingConfirmation.confirm).not.toHaveBeenCalled();
      expect(result.completed).toBe(true);
    });

    it('should reduce max iterations by previous iterations', async () => {
      const toolResult: ToolExecutionResult = {
        toolCallId: 'call_1',
        toolName: 'test_tool',
        content: 'result',
        success: true,
      };

      const pendingConfirmation = {
        toolCall: { id: 'call_1', name: 'test_tool', arguments: {} },
        description: 'Test',
        confirm: vi.fn().mockResolvedValueOnce(toolResult),
        reject: vi.fn(),
      };

      const previousResult = {
        content: 'Waiting...',
        iterations: 3,
        toolCalls: [],
        toolResults: [],
        messages: [{ role: 'user' as const, content: 'Test' }],
        completed: false,
        pendingConfirmation,
      };

      // Mock to always return tool calls to hit max iterations
      vi.mocked(mockLLM.chatWithTools).mockResolvedValue({
        content: 'Calling...',
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'call_2', name: 'test_tool', arguments: {} }],
      });

      vi.mocked(mockExecutor.execute).mockResolvedValue({
        toolCallId: 'call_2',
        toolName: 'test_tool',
        content: 'result',
        success: true,
      });

      // With maxIterations=5 and previousResult.iterations=3, we should have 2 iterations left
      await expect(
        continueToolLoop(mockLLM, previousResult, true, {
          tools: [testTool],
          executor: mockExecutor,
          maxIterations: 5,
        })
      ).rejects.toThrow(MaxIterationsExceededError);
    });
  });

  describe('createSimpleExecutor', () => {
    it('should execute handler and return success result', async () => {
      const handlers = {
        search: vi.fn().mockResolvedValueOnce({ items: ['a', 'b'] }),
      };

      const executor = createSimpleExecutor(handlers);
      const result = await executor.execute({
        id: 'call_1',
        name: 'search',
        arguments: { query: 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"items":["a","b"]}');
      expect(handlers.search).toHaveBeenCalledWith({ query: 'test' });
    });

    it('should throw ToolNotFoundError for unknown tool', async () => {
      const executor = createSimpleExecutor({});

      await expect(
        executor.execute({
          id: 'call_1',
          name: 'unknown_tool',
          arguments: {},
        })
      ).rejects.toThrow(ToolNotFoundError);
    });

    it('should return error result when handler throws', async () => {
      const handlers = {
        failing_tool: vi.fn().mockRejectedValueOnce(new Error('Handler failed')),
      };

      const executor = createSimpleExecutor(handlers);
      const result = await executor.execute({
        id: 'call_1',
        name: 'failing_tool',
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler failed');
    });

    it('should check confirmation tools correctly', () => {
      const confirmationTools = new Set(['record_metric', 'delete_item']);
      const executor = createSimpleExecutor({}, confirmationTools);

      expect(executor.requiresConfirmation('record_metric')).toBe(true);
      expect(executor.requiresConfirmation('delete_item')).toBe(true);
      expect(executor.requiresConfirmation('search')).toBe(false);
    });

    it('should default to no confirmation required', () => {
      const executor = createSimpleExecutor({});

      expect(executor.requiresConfirmation('any_tool')).toBe(false);
    });
  });
});
