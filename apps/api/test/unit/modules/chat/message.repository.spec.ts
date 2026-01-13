import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
  and: vi.fn((...args: unknown[]) => args),
  asc: vi.fn(() => 'asc-result'),
  desc: vi.fn(() => 'desc-result'),
}));

import { MessageRepository } from '../../../../src/modules/chat/infrastructure/repositories/message.repository.js';

/**
 * Create a mock message for testing
 */
function createMockMessage(
  overrides: Partial<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: unknown;
    createdAt: Date;
  }> = {}
) {
  return {
    id: 'msg-123',
    conversationId: 'conv-123',
    role: 'user' as const,
    content: 'Hello',
    metadata: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let mockDatabaseService: {
    schema: { messages: object; conversations: object };
    withUserId: ReturnType<typeof vi.fn>;
    withUserTransaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database service
    mockDatabaseService = {
      schema: { messages: {}, conversations: {} },
      withUserId: vi.fn(),
      withUserTransaction: vi.fn(),
    };

    // Create repository instance with mocks
    repository = new MessageRepository(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof MessageRepository
      >[0]
    );
  });

  describe('create', () => {
    it('should_create_message_and_update_conversation', async () => {
      const mockMessage = createMockMessage();
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMessage]),
        }),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDatabaseService.withUserTransaction.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            insert: mockInsert,
            update: mockUpdate,
          });
        }
      );

      const result = await repository.create('user-123', {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello',
      });

      expect(result).toEqual(mockMessage);
      expect(mockDatabaseService.withUserTransaction).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should_throw_when_insert_fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDatabaseService.withUserTransaction.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            insert: mockInsert,
          });
        }
      );

      await expect(
        repository.create('user-123', {
          conversationId: 'conv-123',
          role: 'user',
          content: 'Hello',
        })
      ).rejects.toThrow('Failed to create message');
    });
  });

  describe('findByConversationId', () => {
    it('should_return_messages_when_conversation_exists', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1' }),
        createMockMessage({ id: 'msg-2', role: 'assistant' }),
      ];
      const mockConversation = { id: 'conv-123' };

      const createSelectForConversation = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConversation]),
          }),
        }),
      });

      const createSelectForMessages = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockMessages),
              }),
            }),
          }),
        }),
      });

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createSelectForConversation();
        }
        return createSelectForMessages();
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.findByConversationId(
        'user-123',
        'conv-123'
      );

      expect(result).toEqual(mockMessages);
    });

    it('should_return_empty_array_when_conversation_not_found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.findByConversationId(
        'user-123',
        'nonexistent'
      );

      expect(result).toEqual([]);
    });
  });

  describe('countByConversationId', () => {
    it('should_return_count_when_conversation_exists', async () => {
      const mockConversation = { id: 'conv-123' };
      const mockMessageCounts = [{ count: 1 }, { count: 2 }, { count: 3 }];

      const createSelectForConversation = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConversation]),
          }),
        }),
      });

      const createSelectForCount = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMessageCounts),
        }),
      });

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createSelectForConversation();
        }
        return createSelectForCount();
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.countByConversationId(
        'user-123',
        'conv-123'
      );

      expect(result).toBe(3);
    });

    it('should_return_zero_when_conversation_not_found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.countByConversationId(
        'user-123',
        'nonexistent'
      );

      expect(result).toBe(0);
    });
  });

  describe('getRecentMessages', () => {
    it('should_return_messages_in_chronological_order', async () => {
      const mockConversation = { id: 'conv-123' };
      // Messages in reverse order (most recent first)
      const mockMessagesReverse = [
        createMockMessage({ id: 'msg-3', createdAt: new Date('2024-01-03') }),
        createMockMessage({ id: 'msg-2', createdAt: new Date('2024-01-02') }),
        createMockMessage({ id: 'msg-1', createdAt: new Date('2024-01-01') }),
      ];

      const createSelectForConversation = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConversation]),
          }),
        }),
      });

      const createSelectForMessages = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockMessagesReverse),
            }),
          }),
        }),
      });

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createSelectForConversation();
        }
        return createSelectForMessages();
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.getRecentMessages(
        'user-123',
        'conv-123',
        10
      );

      // Should be reversed to chronological order
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
      expect(result[2].id).toBe('msg-3');
    });

    it('should_return_empty_array_when_conversation_not_found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.getRecentMessages(
        'user-123',
        'nonexistent',
        10
      );

      expect(result).toEqual([]);
    });
  });
});
