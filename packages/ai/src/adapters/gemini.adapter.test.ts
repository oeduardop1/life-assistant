import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { GeminiAdapter } from './gemini.adapter.js';
import { LLMAPIError, StreamingError } from '../errors/ai.errors.js';

// Hoist mock functions
const { mockGenerateContent, mockGenerateContentStream } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  })),
  FunctionCallingConfigMode: {
    AUTO: 'AUTO',
    ANY: 'ANY',
    NONE: 'NONE',
  },
  FinishReason: {
    STOP: 'STOP',
    MAX_TOKENS: 'MAX_TOKENS',
  },
  Type: {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
  },
}));

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
interface GeminiMockCallArg {
  model: string;
  contents: {
    role: string;
    parts: { text?: string; functionCall?: unknown; functionResponse?: { name: string; response: unknown } }[];
  }[];
  config?: {
    systemInstruction?: string;
    temperature?: number;
    tools?: unknown[];
    toolConfig?: {
      functionCallingConfig?: { mode: string };
    };
  };
}

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GeminiAdapter({
      apiKey: 'test-api-key',
      model: 'gemini-2.5-flash',
    });
  });

  describe('constructor', () => {
    it('should create adapter with config', () => {
      const info = adapter.getInfo();
      expect(info.name).toBe('gemini');
      expect(info.model).toBe('gemini-2.5-flash');
    });

    it('should use default max tokens', () => {
      const adapterWithDefaults = new GeminiAdapter({
        apiKey: 'test-key',
        model: 'test-model',
      });
      expect(adapterWithDefaults.getInfo()).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send basic chat request', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Hello!',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
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
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'You are helpful',
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: 'You are helpful',
          }) as unknown,
        })
      );
    });

    it('should include temperature when provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            temperature: 0.7,
          }) as unknown,
        })
      );
    });

    it('should map MAX_TOKENS finish reason to length', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Truncated...',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 100 },
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      });

      const response = await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.finishReason).toBe('length');
    });

    it('should propagate errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        adapter.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow(LLMAPIError);
    });

    it('should handle missing usage metadata', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Hello',
        candidates: [{ finishReason: 'STOP' }],
      });

      const response = await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.usage.inputTokens).toBe(0);
      expect(response.usage.outputTokens).toBe(0);
    });

    it('should handle missing candidates', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Hello',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      });

      const response = await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.finishReason).toBe('stop');
    });
  });

  describe('chatWithTools', () => {
    const searchTool = {
      name: 'search',
      description: 'Search tool',
      parameters: z.object({ query: z.string().optional() }),
    };

    it('should send request with tools', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Let me search...',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        candidates: [{ finishReason: 'STOP' }],
      });

      const response = await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Search for X' }],
        tools: [searchTool],
      });

      expect(response.content).toBe('Let me search...');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            tools: expect.any(Array) as unknown[],
          }) as unknown,
        })
      );
    });

    it('should return tool calls from response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Searching...',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        candidates: [{ finishReason: 'STOP' }],
        functionCalls: [{ name: 'search', args: { query: 'test' } }],
      });

      const response = await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [searchTool],
      });

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0].name).toBe('search');
      expect(response.toolCalls?.[0].arguments).toEqual({ query: 'test' });
      expect(response.finishReason).toBe('tool_calls');
    });

    it('should map tool choice required to ANY', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [searchTool],
        toolChoice: 'required',
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            toolConfig: expect.objectContaining({
              functionCallingConfig: { mode: 'ANY' },
            }) as unknown,
          }) as unknown,
        })
      );
    });

    it('should map tool choice none to NONE', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [searchTool],
        toolChoice: 'none',
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            toolConfig: expect.objectContaining({
              functionCallingConfig: { mode: 'NONE' },
            }) as unknown,
          }) as unknown,
        })
      );
    });

    it('should generate unique tool call IDs', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        candidates: [{ finishReason: 'STOP' }],
        functionCalls: [
          { name: 'search', args: { query: 'a' } },
          { name: 'search', args: { query: 'b' } },
        ],
      });

      const response = await adapter.chatWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [searchTool],
      });

      expect(response.toolCalls?.[0].id).toBe('call_0');
      expect(response.toolCalls?.[1].id).toBe('call_1');
    });
  });

  describe('stream', () => {
    it('should yield text chunks', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { text: 'Hello' };
          yield { text: ' World' };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockAsyncIterator);

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
          yield { text: 'Hi' };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockAsyncIterator);

      let lastChunk;
      for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
        lastChunk = chunk;
      }

      expect(lastChunk?.done).toBe(true);
    });

    it('should skip empty text chunks', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { text: '' };
          yield { text: 'Hello' };
          yield { text: undefined };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockAsyncIterator);

      const chunks: string[] = [];
      for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
        if (!chunk.done && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Hello']);
    });

    it('should throw StreamingError on failure', async () => {
      mockGenerateContentStream.mockRejectedValueOnce(new Error('Stream failed'));

      await expect(async () => {
        for await (const _chunk of adapter.stream({ messages: [{ role: 'user', content: 'Hi' }] })) {
          // consume
        }
      }).rejects.toThrow(StreamingError);
    });
  });

  describe('streamWithTools', () => {
    const searchTool = {
      name: 'search',
      description: 'Search tool',
      parameters: z.object({ query: z.string().optional() }),
    };

    it('should yield text and accumulate function calls', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { text: 'Searching...' };
          yield {
            text: '',
            functionCalls: [{ name: 'search', args: { query: 'test' } }],
          };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockAsyncIterator);

      const chunks: { content: string; done: boolean; toolCalls?: unknown[] }[] = [];
      for await (const chunk of adapter.streamWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [searchTool],
      })) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk?.done).toBe(true);
      expect(lastChunk?.toolCalls).toHaveLength(1);
      expect(lastChunk?.toolCalls?.[0]).toEqual({
        id: 'call_0',
        name: 'search',
        arguments: { query: 'test' },
      });
    });

    it('should accumulate multiple function calls', async () => {
      const mockAsyncIterator = {
        *[Symbol.asyncIterator]() {
          yield { functionCalls: [{ name: 'search', args: { query: 'a' } }] };
          yield { functionCalls: [{ name: 'search', args: { query: 'b' } }] };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockAsyncIterator);

      const chunks: { toolCalls?: unknown[] }[] = [];
      for await (const chunk of adapter.streamWithTools({
        messages: [{ role: 'user', content: 'Search' }],
        tools: [searchTool],
      })) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk?.toolCalls).toHaveLength(2);
    });
  });

  describe('getInfo', () => {
    it('should return provider info', () => {
      const info = adapter.getInfo();

      expect(info.name).toBe('gemini');
      expect(info.model).toBe('gemini-2.5-flash');
      expect(info.supportsToolUse).toBe(true);
      expect(info.supportsStreaming).toBe(true);
    });
  });

  describe('message conversion', () => {
    it('should skip system messages (passed via config)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chat({
        messages: [
          { role: 'system', content: 'System instruction' },
          { role: 'user', content: 'Hi' },
        ],
      });

      const call = mockGenerateContent.mock.calls[0]?.[0] as GeminiMockCallArg | undefined;
      expect(call?.contents).toHaveLength(1);
      expect(call?.contents[0]?.role).toBe('user');
    });

    it('should convert tool messages to functionResponse', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'I see the results',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chat({
        messages: [
          { role: 'user', content: 'Search' },
          {
            role: 'assistant',
            content: 'Searching...',
            toolCalls: [{ id: 'search_call', name: 'search', arguments: { q: 'test' } }],
          },
          { role: 'tool', content: '{"results": []}', toolCallId: 'search_call' },
        ],
      });

      const call = mockGenerateContent.mock.calls[0]?.[0] as GeminiMockCallArg | undefined;
      const toolMessage = call?.contents.find((c) =>
        c.parts.some((p) => p.functionResponse),
      );
      expect(toolMessage).toBeDefined();
      expect(toolMessage?.parts[0]?.functionResponse?.name).toBe('search_call');
    });

    it('should map assistant role to model', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      await adapter.chat({
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'How are you?' },
        ],
      });

      const call = mockGenerateContent.mock.calls[0]?.[0] as GeminiMockCallArg | undefined;
      expect(call?.contents[1]?.role).toBe('model');
    });
  });

  describe('rate limiting', () => {
    it('should work with rate limiting disabled', async () => {
      const adapterNoRateLimit = new GeminiAdapter({
        apiKey: 'test-key',
        model: 'test-model',
        enableRateLimiting: false,
      });

      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      const response = await adapterNoRateLimit.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Response');
    });
  });

  describe('retry', () => {
    it('should work with retries disabled', async () => {
      const adapterNoRetry = new GeminiAdapter({
        apiKey: 'test-key',
        model: 'test-model',
        enableRetries: false,
      });

      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        candidates: [{ finishReason: 'STOP' }],
      });

      const response = await adapterNoRetry.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Response');
    });
  });
});
