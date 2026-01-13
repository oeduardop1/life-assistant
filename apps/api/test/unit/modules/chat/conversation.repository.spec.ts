import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
  and: vi.fn((...args: unknown[]) => args),
  isNull: vi.fn(() => 'isNull-result'),
  desc: vi.fn(() => 'desc-result'),
}));

import { ConversationRepository } from '../../../../src/modules/chat/infrastructure/repositories/conversation.repository.js';

/**
 * Create a mock conversation for testing
 */
function createMockConversation(
  overrides: Partial<{
    id: string;
    userId: string;
    type: string;
    title: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = {}
) {
  return {
    id: 'conv-123',
    userId: 'user-123',
    type: 'general',
    title: null,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  let mockDatabaseService: {
    schema: { conversations: object };
    withUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database service
    mockDatabaseService = {
      schema: { conversations: {} },
      withUserId: vi.fn(),
    };

    // Create repository instance with mocks
    repository = new ConversationRepository(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof ConversationRepository
      >[0]
    );
  });

  describe('create', () => {
    it('should_create_conversation_and_return_it', async () => {
      const mockConversation = createMockConversation();
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockConversation]),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            insert: mockInsert,
          });
        }
      );

      const result = await repository.create('user-123', {
        type: 'general',
      });

      expect(result).toEqual(mockConversation);
      expect(mockDatabaseService.withUserId).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
    });

    it('should_throw_when_insert_fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            insert: mockInsert,
          });
        }
      );

      await expect(
        repository.create('user-123', { type: 'general' })
      ).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('findById', () => {
    it('should_return_conversation_when_found', async () => {
      const mockConversation = createMockConversation();
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConversation]),
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

      const result = await repository.findById('user-123', 'conv-123');

      expect(result).toEqual(mockConversation);
    });

    it('should_return_null_when_not_found', async () => {
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

      const result = await repository.findById('user-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('should_return_conversations_for_user', async () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockConversations),
              }),
            }),
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

      const result = await repository.findAllByUserId('user-123');

      expect(result).toEqual(mockConversations);
      expect(result).toHaveLength(2);
    });

    it('should_apply_pagination_options', async () => {
      const mockConversations = [createMockConversation()];

      const mockOffset = vi.fn().mockResolvedValue(mockConversations);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      await repository.findAllByUserId('user-123', { limit: 10, offset: 5 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockOffset).toHaveBeenCalledWith(5);
    });
  });

  describe('countByUserId', () => {
    it('should_return_count_of_conversations', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }, { count: 2 }, { count: 3 }]),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.countByUserId('user-123');

      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('should_update_and_return_conversation', async () => {
      const mockConversation = createMockConversation({ title: 'Updated Title' });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockConversation]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            update: mockUpdate,
          });
        }
      );

      const result = await repository.update('user-123', 'conv-123', {
        title: 'Updated Title',
      });

      expect(result).toEqual(mockConversation);
    });

    it('should_return_null_when_update_fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            update: mockUpdate,
          });
        }
      );

      const result = await repository.update('user-123', 'nonexistent', {
        title: 'Updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should_soft_delete_and_return_true', async () => {
      const mockConversation = createMockConversation({
        deletedAt: new Date(),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockConversation]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            update: mockUpdate,
          });
        }
      );

      const result = await repository.softDelete('user-123', 'conv-123');

      expect(result).toBe(true);
    });

    it('should_return_false_when_conversation_not_found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            update: mockUpdate,
          });
        }
      );

      const result = await repository.softDelete('user-123', 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
