import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ClaudeAdapter } from './claude.adapter.js';
import { StreamingError } from '../errors/ai.errors.js';

// Hoist mock functions so they can be used in vi.mock
const { mockCreate, mockStream, mockBetaCreate, mockBetaStream } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockStream: vi.fn(),
  mockBetaCreate: vi.fn(),
  mockBetaStream: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  // Must define inside the factory since mocks are hoisted
  class APIError extends Error {
    status: number;
    constructor(status: number, error: { message: string }) {
      super(error.message);
      this.name = 'APIError';
      this.status = status;
    }
  }

  // Create a mock class that has APIError as a static property
  function MockAnthropicClass() {
    return {
      messages: {
        create: mockCreate,
        stream: mockStream,
      },
      beta: {
        messages: {
          create: mockBetaCreate,
          stream: mockBetaStream,
        },
      },
    };
  }
  MockAnthropicClass.APIError = APIError;

  return {
    default: MockAnthropicClass,
    APIError,
  };
});

// Mock rate limiter
vi.mock('../utils/rate-limiter.js', () => ({
  getRateLimiter: vi.fn(() => ({
    checkAndWait: vi.fn(),
    recordActualUsage: vi.fn(),
  })),
}));

// Mock retry
vi.mock('../utils/retry.js', () => ({
  retryWithBackoff: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// Type for mock call arguments
interface MockCallArg {
  messages: {
    role: string;
    content: unknown;
  }[];
  system?: string;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  betas?: string[];
}

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeAdapter({
      apiKey: 'test-api-key',
      model: 'claude-sonnet-4-5-20250929',
    });
  });

  describe('constructor', () => {
    it('should create adapter with config', () => {
      const info = adapter.getInfo();
      expect(info.name).toBe('claude');
      expect(info.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should use default max tokens', () => {
      const adapterWithDefaults = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'test-model',
      });
      expect(adapterWithDefaults.getInfo()).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send basic chat request', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const response = await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Hello!');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(5);
      expect(response.finishReason).toBe('stop');
    });

    it('should include system prompt when provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'You are helpful',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are helpful',
        })
      );
    });

    it('should include temperature when provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it('should map max_tokens stop reason to length', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Truncated...' }],
        usage: { input_tokens: 10, output_tokens: 100 },
        stop_reason: 'max_tokens',
      });

      const response = await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.finishReason).toBe('length');
    });

    it('should propagate errors', async () => {
      const testError = new Error('Test API Error');
      mockCreate.mockRejectedValueOnce(testError);

      await expect(
        adapter.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow('Test API Error');
    });
  });

  describe('chatWithTools', () => {
    it('should send request with tools', async () => {
      mockBetaCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Let me search...' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      const response = await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Search for X' }],
        tools: [
          {
            name: 'search',
            description: 'Search tool',
            parameters: z.object({ query: z.string().optional() }),
          },
        ],
      });

      expect(response.content).toBe('Let me search...');
      expect(mockBetaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array) as unknown[],
          betas: ['advanced-tool-use-2025-11-20'],
        })
      );
    });

    it('should return tool calls from response', async () => {
      mockBetaCreate.mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Searching...' },
          { type: 'tool_use', id: 'call_1', name: 'search', input: { query: 'test' } },
        ],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'tool_use',
      });

      const response = await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [{ name: 'search', description: 'Search', parameters: z.object({ query: z.string().optional() }) }],
      });

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0].id).toBe('call_1');
      expect(response.toolCalls?.[0].name).toBe('search');
      expect(response.toolCalls?.[0].arguments).toEqual({ query: 'test' });
      expect(response.finishReason).toBe('tool_calls');
    });

    it('should map tool choice required to any', async () => {
      mockBetaCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [{ name: 'tool', description: 'desc', parameters: z.object({ query: z.string().optional() }) }],
        toolChoice: 'required',
      });

      expect(mockBetaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_choice: { type: 'any' },
        })
      );
    });
  });

  describe('stream', () => {
    it('should yield text chunks', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Hello' } };
          yield { type: 'content_block_delta', delta: { text: ' World' } };
        },
      };
      mockStream.mockReturnValueOnce(mockAsyncIterator);

      const chunks: string[] = [];
      for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Hello', ' World']);
    });

    it('should yield done chunk at end', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Hi' } };
        },
      };
      mockStream.mockReturnValueOnce(mockAsyncIterator);

      let lastChunk;
      for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
        lastChunk = chunk;
      }

      expect(lastChunk?.done).toBe(true);
    });

    it('should throw StreamingError on failure', async () => {
      mockStream.mockImplementationOnce(() => {
        throw new Error('Stream failed');
      });

      await expect(async () => {
        for await (const _chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
          // consume
        }
      }).rejects.toThrow(StreamingError);
    });
  });

  describe('streamWithTools', () => {
    it('should yield text and accumulate tool calls', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Searching...' } };
          yield {
            type: 'content_block_start',
            content_block: { type: 'tool_use', id: 'call_1', name: 'search' },
          };
          yield { type: 'content_block_delta', delta: { partial_json: '{"query":' } };
          yield { type: 'content_block_delta', delta: { partial_json: '"test"}' } };
          yield { type: 'content_block_stop' };
        },
      };
      mockBetaStream.mockReturnValueOnce(mockAsyncIterator);

      const chunks: { content: string; done: boolean; toolCalls?: unknown[] }[] = [];
      for await (const chunk of adapter.streamWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [{ name: 'search', description: 'Search', parameters: z.object({ query: z.string().optional() }) }],
      })) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk?.done).toBe(true);
      expect(lastChunk?.toolCalls).toHaveLength(1);
      expect(lastChunk?.toolCalls?.[0]).toEqual({
        id: 'call_1',
        name: 'search',
        arguments: { query: 'test' },
      });
    });

    it('should skip invalid JSON in tool arguments', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
            content_block: { type: 'tool_use', id: 'call_1', name: 'search' },
          };
          yield { type: 'content_block_delta', delta: { partial_json: 'invalid json' } };
          yield { type: 'content_block_stop' };
        },
      };
      mockBetaStream.mockReturnValueOnce(mockAsyncIterator);

      const chunks: { toolCalls?: unknown[] }[] = [];
      for await (const chunk of adapter.streamWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [{ name: 'search', description: 'Search', parameters: z.object({ query: z.string().optional() }) }],
      })) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk?.toolCalls).toBeUndefined();
    });
  });

  describe('getInfo', () => {
    it('should return provider info', () => {
      const info = adapter.getInfo();

      expect(info.name).toBe('claude');
      expect(info.model).toBe('claude-sonnet-4-5-20250929');
      expect(info.supportsToolUse).toBe(true);
      expect(info.supportsStreaming).toBe(true);
    });
  });

  describe('message conversion', () => {
    it('should filter system messages', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await adapter.chat({
        messages: [
          { role: 'system', content: 'System instruction' },
          { role: 'user', content: 'Hi' },
        ],
      });

      const call = mockCreate.mock.calls[0]?.[0] as MockCallArg | undefined;
      expect(call?.messages).toHaveLength(1);
      expect(call?.messages[0]?.role).toBe('user');
    });

    it('should convert tool messages to tool_result', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I see the results' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      await adapter.chat({
        messages: [
          { role: 'user', content: 'Search' },
          {
            role: 'assistant',
            content: 'Searching...',
            toolCalls: [{ id: 'call_1', name: 'search', arguments: { q: 'test' } }],
          },
          { role: 'tool', content: '{"results": []}', toolCallId: 'call_1' },
        ],
      });

      const call = mockCreate.mock.calls[0]?.[0] as MockCallArg | undefined;
      const toolMessage = call?.messages.find(
        (m) => m.role === 'user' && Array.isArray(m.content)
      );
      const content = toolMessage?.content as { type: string; tool_use_id: string }[] | undefined;
      expect(content?.[0]?.type).toBe('tool_result');
      expect(content?.[0]?.tool_use_id).toBe('call_1');
    });

    it('should convert assistant messages with tool calls', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Done' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      await adapter.chat({
        messages: [
          { role: 'user', content: 'Search' },
          {
            role: 'assistant',
            content: 'Searching...',
            toolCalls: [{ id: 'call_1', name: 'search', arguments: { q: 'test' } }],
          },
          { role: 'tool', content: 'results', toolCallId: 'call_1' },
        ],
      });

      const call = mockCreate.mock.calls[0]?.[0] as MockCallArg | undefined;
      const assistantMessage = call?.messages.find(
        (m) => m.role === 'assistant' && Array.isArray(m.content)
      );
      expect(assistantMessage?.content).toContainEqual(
        expect.objectContaining({ type: 'tool_use', id: 'call_1', name: 'search' })
      );
    });
  });

  describe('rate limiting', () => {
    it('should work with rate limiting disabled', async () => {
      const adapterNoRateLimit = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'test-model',
        enableRateLimiting: false,
      });

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const response = await adapterNoRateLimit.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Response');
    });
  });

  describe('retry', () => {
    it('should work with retries disabled', async () => {
      const adapterNoRetry = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'test-model',
        enableRetries: false,
      });

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const response = await adapterNoRetry.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Response');
    });
  });
});
