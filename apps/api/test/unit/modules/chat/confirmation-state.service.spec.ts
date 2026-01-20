import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCall, ToolDefinition } from '@life-assistant/ai';

// Use vi.hoisted to create mock functions that are available when vi.mock runs
const mocks = vi.hoisted(() => {
  return {
    setex: vi.fn(),
    get: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  };
});

// Mock ioredis with a class constructor using vi.fn pattern
vi.mock('ioredis', () => {
  const MockRedis = vi.fn(function (this: typeof mocks) {
    this.setex = mocks.setex;
    this.get = mocks.get;
    this.keys = mocks.keys;
    this.del = mocks.del;
    this.quit = mocks.quit;
    this.on = mocks.on;
  } as unknown as new () => typeof mocks);
  return { default: MockRedis };
});

// Import after mock is set up
import { ConfirmationStateService } from '../../../../src/modules/chat/application/services/confirmation-state.service.js';

// Convenience reference for test assertions
const mockRedis = mocks;

/**
 * Create a mock tool call
 */
function createMockToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 'tool-call-123',
    name: 'record_metric',
    arguments: {
      type: 'weight',
      value: 75,
      unit: 'kg',
      date: '2024-01-15',
    },
    ...overrides,
  };
}

/**
 * Create a mock tool definition
 */
function createMockToolDefinition(
  overrides: Partial<ToolDefinition> = {}
): ToolDefinition {
  return {
    name: 'record_metric',
    description: 'Record a metric',
    parameters: {} as any,
    requiresConfirmation: true,
    ...overrides,
  };
}

/**
 * Create a mock stored confirmation
 */
function createMockStoredConfirmation(overrides: Record<string, unknown> = {}) {
  return {
    confirmationId: 'conf_1234567890_abc1234',
    conversationId: 'conv-123',
    userId: 'user-123',
    toolCall: createMockToolCall(),
    toolName: 'record_metric',
    message: 'Registrar peso: 75 kg em 2024-01-15?',
    iteration: 1,
    createdAt: '2024-01-15T10:00:00.000Z',
    expiresAt: '2024-01-15T10:05:00.000Z',
    ...overrides,
  };
}

describe('ConfirmationStateService', () => {
  let service: ConfirmationStateService;
  let mockConfigService: { redisUrl: string };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      redisUrl: 'redis://localhost:6379',
    };

    service = new ConfirmationStateService(
      mockConfigService as unknown as ConstructorParameters<
        typeof ConfirmationStateService
      >[0]
    );
  });

  describe('store', () => {
    it('should_save_to_redis_with_5min_ttl', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.store(
        'user-123',
        'conv-123',
        createMockToolCall(),
        createMockToolDefinition(),
        1
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('chat:confirmation:conv-123:conf_'),
        300, // 5 minutes TTL
        expect.any(String)
      );
    });

    it('should_generate_unique_confirmation_id', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result1 = await service.store(
        'user-123',
        'conv-123',
        createMockToolCall(),
        createMockToolDefinition(),
        1
      );

      const result2 = await service.store(
        'user-123',
        'conv-123',
        createMockToolCall(),
        createMockToolDefinition(),
        1
      );

      expect(result1.confirmationId).not.toBe(result2.confirmationId);
      expect(result1.confirmationId).toMatch(/^conf_\d+_[a-z0-9]+$/);
      expect(result2.confirmationId).toMatch(/^conf_\d+_[a-z0-9]+$/);
    });

    it('should_generate_correct_message_for_record_metric', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall({
        arguments: { type: 'weight', value: 75, unit: 'kg', date: '2024-01-15' },
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition(),
        1
      );

      expect(result.message).toBe('Registrar peso: 75 kg em 2024-01-15?');
    });

    it('should_use_portuguese_labels_for_water', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall({
        arguments: { type: 'water', value: 2000, unit: 'ml', date: '2024-01-15' },
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition(),
        1
      );

      expect(result.message).toBe('Registrar água: 2000 ml em 2024-01-15?');
    });

    it('should_use_portuguese_labels_for_sleep', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall({
        arguments: { type: 'sleep', value: 8, unit: 'hours', date: '2024-01-15' },
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition(),
        1
      );

      expect(result.message).toBe('Registrar sono: 8 horas em 2024-01-15?');
    });

    it('should_generate_message_for_add_knowledge', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall({
        name: 'add_knowledge',
        arguments: { type: 'fact', content: 'User likes coffee in the morning' },
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition({ name: 'add_knowledge' }),
        1
      );

      expect(result.message).toBe(
        'Salvar conhecimento: "User likes coffee in the morning"?'
      );
    });

    it('should_truncate_long_knowledge_content', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const longContent =
        'This is a very long piece of content that exceeds fifty characters and should be truncated';
      const toolCall = createMockToolCall({
        name: 'add_knowledge',
        arguments: { type: 'fact', content: longContent },
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition({ name: 'add_knowledge' }),
        1
      );

      expect(result.message.length).toBeLessThanOrEqual(100);
      expect(result.message).toContain('...');
    });

    it('should_generate_default_message_for_unknown_tool', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall({
        name: 'unknown_tool',
        arguments: {},
      });

      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition({ name: 'unknown_tool' }),
        1
      );

      expect(result.message).toBe('Executar unknown_tool?');
    });

    it('should_include_all_fields_in_stored_confirmation', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const toolCall = createMockToolCall();
      const result = await service.store(
        'user-123',
        'conv-123',
        toolCall,
        createMockToolDefinition(),
        5
      );

      expect(result.userId).toBe('user-123');
      expect(result.conversationId).toBe('conv-123');
      expect(result.toolCall).toEqual(toolCall);
      expect(result.toolName).toBe('record_metric');
      expect(result.iteration).toBe(5);
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('get', () => {
    it('should_return_confirmation_when_exists', async () => {
      const mockConfirmation = createMockStoredConfirmation();
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConfirmation));

      const result = await service.get('conv-123', mockConfirmation.confirmationId);

      expect(result.found).toBe(true);
      expect(result.confirmation).toEqual(mockConfirmation);
    });

    it('should_return_not_found_when_expired', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('conv-123', 'expired-conf-id');

      expect(result.found).toBe(false);
      expect(result.confirmation).toBeUndefined();
    });

    it('should_return_not_found_when_invalid_json', async () => {
      mockRedis.get.mockResolvedValue('invalid json {{{');

      const result = await service.get('conv-123', 'conf-id');

      expect(result.found).toBe(false);
    });
  });

  describe('getLatest', () => {
    it('should_return_most_recent_confirmation', async () => {
      const olderConfirmation = createMockStoredConfirmation({
        confirmationId: 'conf-old',
        createdAt: '2024-01-15T09:00:00.000Z',
      });
      const newerConfirmation = createMockStoredConfirmation({
        confirmationId: 'conf-new',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockRedis.keys.mockResolvedValue([
        'chat:confirmation:conv-123:conf-old',
        'chat:confirmation:conv-123:conf-new',
      ]);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(olderConfirmation))
        .mockResolvedValueOnce(JSON.stringify(newerConfirmation));

      const result = await service.getLatest('conv-123');

      expect(result).toEqual(newerConfirmation);
    });

    it('should_return_null_when_no_confirmations', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getLatest('conv-123');

      expect(result).toBeNull();
    });

    it('should_skip_invalid_data_and_return_valid', async () => {
      const validConfirmation = createMockStoredConfirmation();

      mockRedis.keys.mockResolvedValue([
        'chat:confirmation:conv-123:invalid',
        'chat:confirmation:conv-123:valid',
      ]);
      mockRedis.get
        .mockResolvedValueOnce('invalid json')
        .mockResolvedValueOnce(JSON.stringify(validConfirmation));

      const result = await service.getLatest('conv-123');

      expect(result).toEqual(validConfirmation);
    });
  });

  describe('confirm', () => {
    it('should_delete_after_retrieval', async () => {
      const mockConfirmation = createMockStoredConfirmation();
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConfirmation));
      mockRedis.del.mockResolvedValue(1);

      const result = await service.confirm(
        'conv-123',
        mockConfirmation.confirmationId
      );

      expect(result).toEqual(mockConfirmation);
      expect(mockRedis.del).toHaveBeenCalledWith(
        `chat:confirmation:conv-123:${mockConfirmation.confirmationId}`
      );
    });

    it('should_return_null_when_not_found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.confirm('conv-123', 'nonexistent');

      expect(result).toBeNull();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should_delete_without_execution', async () => {
      const mockConfirmation = createMockStoredConfirmation();
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConfirmation));
      mockRedis.del.mockResolvedValue(1);

      const result = await service.reject(
        'conv-123',
        mockConfirmation.confirmationId
      );

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        `chat:confirmation:conv-123:${mockConfirmation.confirmationId}`
      );
    });

    it('should_return_false_when_not_found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.reject('conv-123', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should_delete_all_confirmations_for_conversation', async () => {
      mockRedis.keys.mockResolvedValue([
        'chat:confirmation:conv-123:conf-1',
        'chat:confirmation:conv-123:conf-2',
        'chat:confirmation:conv-123:conf-3',
      ]);
      mockRedis.del.mockResolvedValue(3);

      await service.clearAll('conv-123');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'chat:confirmation:conv-123:conf-1',
        'chat:confirmation:conv-123:conf-2',
        'chat:confirmation:conv-123:conf-3'
      );
    });

    it('should_not_call_del_when_no_confirmations', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.clearAll('conv-123');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should_close_redis_connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
