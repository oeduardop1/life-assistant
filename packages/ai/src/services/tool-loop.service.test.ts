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

    /**
     * Tests for pendingConfirmation (ADR-015: Low Friction Tracking)
     * @see ADR-015 for details on confirmation flow
     */
    describe('pendingConfirmation', () => {
      // Tool definition that requires confirmation (like record_metric)
      const confirmationRequiredTool: ToolDefinition = {
        name: 'record_metric',
        description: 'Record a metric that requires user confirmation',
        parameters: z.object({ type: z.string(), value: z.number() }),
        requiresConfirmation: true,
      };

      // Tool definition that does NOT require confirmation (like search_knowledge)
      const noConfirmationTool: ToolDefinition = {
        name: 'search_knowledge',
        description: 'Search knowledge without confirmation',
        parameters: z.object({ query: z.string() }),
        requiresConfirmation: false,
      };

      it('should_pause_loop_when_tool_requires_confirmation', async () => {
        const response: ChatWithToolsResponse = {
          content: 'Let me record that weight for you.',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };
        vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Register 75kg' }], {
          tools: [confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        // Loop should have paused - executor should NOT have been called
        expect(mockExecutor.execute).not.toHaveBeenCalled();
        expect(result.pendingConfirmation).toBeDefined();
      });

      it('should_return_pending_confirmation_in_response', async () => {
        const response: ChatWithToolsResponse = {
          content: 'Recording your weight...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };
        vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'My weight is 75kg' }], {
          tools: [confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        expect(result.pendingConfirmation).toBeDefined();
        expect(result.pendingConfirmation?.toolCall).toEqual(
          expect.objectContaining({
            id: 'call_1',
            name: 'record_metric',
            arguments: { type: 'weight', value: 75 },
          })
        );
        expect(result.pendingConfirmation?.toolDefinition).toBe(confirmationRequiredTool);
        expect(result.pendingConfirmation?.iteration).toBe(1);
        expect(result.pendingConfirmation?.messages).toHaveLength(2); // user + assistant
      });

      it('should_resume_loop_after_user_confirms', async () => {
        // First call returns tool call requiring confirmation
        const response1: ChatWithToolsResponse = {
          content: 'Recording your weight...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };
        // Response after tool execution completes
        const response2: ChatWithToolsResponse = {
          content: 'Done! I recorded your weight as 75kg.',
          usage: { inputTokens: 30, outputTokens: 40 },
          finishReason: 'stop',
        };

        // Mock LLM responses:
        // 1. First runToolLoop: returns tool_calls → pauses for confirmation
        // 2. Second runToolLoop (resume): returns same tool_calls → executes with skipConfirmationFor
        // 3. Second runToolLoop iteration 2: returns stop → done
        vi.mocked(mockLLM.chatWithTools)
          .mockResolvedValueOnce(response1)
          .mockResolvedValueOnce(response1) // Same response on resume - LLM is called again
          .mockResolvedValueOnce(response2);

        vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
          toolCallId: 'call_1',
          toolName: 'record_metric',
          content: '{"success": true, "entryId": "entry-123"}',
          success: true,
        });

        // First call pauses with pending confirmation
        const result1 = await runToolLoop(mockLLM, [{ role: 'user', content: 'My weight is 75kg' }], {
          tools: [confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        expect(result1.pendingConfirmation).toBeDefined();
        expect(mockExecutor.execute).not.toHaveBeenCalled();

        // Ensure pendingConfirmation has messages before proceeding
        if (!result1.pendingConfirmation) {
          throw new Error('Expected pendingConfirmation to be defined');
        }

        // Resume with confirmed tool - using skipConfirmationFor
        const result2 = await runToolLoop(
          mockLLM,
          result1.pendingConfirmation.messages,
          {
            tools: [confirmationRequiredTool],
            executor: mockExecutor,
            context: testContext,
            skipConfirmationFor: 'call_1', // The tool call ID that was confirmed
          }
        );

        // Now executor should have been called
        expect(mockExecutor.execute).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'call_1', name: 'record_metric' }),
          testContext
        );
        expect(result2.pendingConfirmation).toBeUndefined();
        expect(result2.content).toBe('Done! I recorded your weight as 75kg.');
      });

      it('should_not_execute_tool_when_user_rejects', async () => {
        const response: ChatWithToolsResponse = {
          content: 'Recording your weight...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };
        vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

        // Get pending confirmation
        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'My weight is 75kg' }], {
          tools: [confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        expect(result.pendingConfirmation).toBeDefined();
        // Executor should NOT have been called - tool requires confirmation
        expect(mockExecutor.execute).not.toHaveBeenCalled();

        // To "reject", the caller simply doesn't resume with skipConfirmationFor
        // The tool call is never executed
        // The caller would typically send a new message to the LLM indicating rejection
      });

      it('should_execute_tools_without_requiresConfirmation', async () => {
        const response1: ChatWithToolsResponse = {
          content: 'Let me search for that...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'search_knowledge', arguments: { query: 'coffee' } },
          ],
        };
        const response2: ChatWithToolsResponse = {
          content: 'Found some results about coffee!',
          usage: { inputTokens: 30, outputTokens: 40 },
          finishReason: 'stop',
        };

        vi.mocked(mockLLM.chatWithTools)
          .mockResolvedValueOnce(response1)
          .mockResolvedValueOnce(response2);

        vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
          toolCallId: 'call_1',
          toolName: 'search_knowledge',
          content: '{"results": ["coffee preferences"]}',
          success: true,
        });

        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Find coffee info' }], {
          tools: [noConfirmationTool],
          executor: mockExecutor,
          context: testContext,
        });

        // Executor should have been called without confirmation
        expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
        expect(result.pendingConfirmation).toBeUndefined();
        expect(result.content).toBe('Found some results about coffee!');
      });

      it('should_handle_mixed_tools_with_and_without_confirmation', async () => {
        const response: ChatWithToolsResponse = {
          content: 'Let me search and record...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            // First tool does NOT require confirmation
            { id: 'call_1', name: 'search_knowledge', arguments: { query: 'weight history' } },
            // Second tool REQUIRES confirmation - loop should pause here
            { id: 'call_2', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };

        vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);
        vi.mocked(mockExecutor.execute).mockResolvedValueOnce({
          toolCallId: 'call_1',
          toolName: 'search_knowledge',
          content: '{"results": []}',
          success: true,
        });

        // Note: In the current implementation, the loop processes tools in order
        // and pauses at the FIRST tool requiring confirmation
        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Search and record' }], {
          tools: [noConfirmationTool, confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        // The first tool (search_knowledge) should execute
        // The second tool (record_metric) should pause for confirmation
        expect(result.pendingConfirmation).toBeDefined();
        expect(result.pendingConfirmation?.toolCall.name).toBe('record_metric');
      });

      it('should_preserve_previous_tool_calls_in_pending_confirmation', async () => {
        const response: ChatWithToolsResponse = {
          content: 'First some search, then recording...',
          usage: { inputTokens: 10, outputTokens: 20 },
          finishReason: 'tool_calls',
          toolCalls: [
            { id: 'call_1', name: 'record_metric', arguments: { type: 'weight', value: 75 } },
          ],
        };

        vi.mocked(mockLLM.chatWithTools).mockResolvedValueOnce(response);

        const result = await runToolLoop(mockLLM, [{ role: 'user', content: 'Record weight' }], {
          tools: [confirmationRequiredTool],
          executor: mockExecutor,
          context: testContext,
        });

        expect(result.pendingConfirmation).toBeDefined();
        expect(result.pendingConfirmation?.previousToolCalls).toEqual([]);
        expect(result.pendingConfirmation?.previousToolResults).toEqual([]);
      });
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
