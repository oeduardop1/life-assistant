/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runToolLoop,
  createSimpleExecutor,
  DEFAULT_MAX_ITERATIONS,
} from './tool-loop.service.js';
import type { LLMPort, Message, ChatWithToolsResponse, ToolDefinition } from '../ports/llm.port.js';
import type { ToolExecutor, ToolExecutionContext } from './tool-executor.service.js';
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
  });

  // Sample tool definition
  const testTool: ToolDefinition = {
    name: 'test_tool',
    description: 'A test tool',
    parameters: z.object({ query: z.string() }),
  };

  // Test context
  const testContext: ToolExecutionContext = {
    userId: 'test-user-123',
    conversationId: 'test-conv-456',
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
        context: testContext,
      });

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
        context: testContext,
      });

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
          context: testContext,
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
        context: testContext,
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

      await runToolLoop(mockLLM, [{ role: 'user', content: 'Search' }], {
        tools: [testTool],
        executor: mockExecutor,
        context: testContext,
      });

      // Check that error was passed to LLM
      const secondCall = vi.mocked(mockLLM.chatWithTools).mock.calls[1];
      const messages = secondCall?.[0].messages;
      const toolMessage = messages?.find((m: Message) => m.role === 'tool');
      expect(toolMessage?.content).toContain('Error: Database error');
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
        context: testContext,
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
      }, testContext);

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"items":["a","b"]}');
      expect(handlers.search).toHaveBeenCalledWith({ query: 'test' }, testContext);
    });

    it('should throw ToolNotFoundError for unknown tool', async () => {
      const executor = createSimpleExecutor({});

      await expect(
        executor.execute({
          id: 'call_1',
          name: 'unknown_tool',
          arguments: {},
        }, testContext)
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
      }, testContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler failed');
    });
  });
});
