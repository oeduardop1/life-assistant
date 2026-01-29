import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI package
vi.mock('@life-assistant/ai', () => ({
  createLLMFromEnv: vi.fn(() => ({
    chat: vi.fn(),
    getInfo: vi.fn().mockReturnValue({ name: 'test', model: 'test-model' }),
  })),
}));

import { MemoryConsolidationProcessor } from '../../../../src/jobs/memory-consolidation/memory-consolidation.processor.js';
import { createLLMFromEnv } from '@life-assistant/ai';
import type { Job } from 'bullmq';
import type { UserMemory, KnowledgeItem } from '@life-assistant/database';

/**
 * Create a mock user memory for testing
 */
function createMockUserMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  return {
    id: 'memory-123',
    userId: 'user-123',
    bio: null,
    occupation: null,
    familyContext: null,
    currentGoals: [],
    currentChallenges: [],
    topOfMind: [],
    values: [],
    learnedPatterns: [],
    communicationStyle: null,
    feedbackPreferences: null,
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastConsolidatedAt: null,
    ...overrides,
  };
}

describe('MemoryConsolidationProcessor', () => {
  let processor: MemoryConsolidationProcessor;
  let mockDatabaseService: {
    db: {
      select: ReturnType<typeof vi.fn>;
      selectDistinct: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    schema: {
      users: object;
      messages: object;
      conversations: object;
      knowledgeItems: object;
      memoryConsolidations: object;
    };
    withUserId: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockUserMemoryService: {
    getOrCreate: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateLastConsolidatedAt: ReturnType<typeof vi.fn>;
  };
  let mockKnowledgeItemsService: {
    add: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    updateConfidence: ReturnType<typeof vi.fn>;
  };
  let mockLLM: {
    chat: ReturnType<typeof vi.fn>;
    getInfo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDatabaseService = {
      db: {
        select: vi.fn(),
        selectDistinct: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
      },
      schema: {
        users: { id: 'id', name: 'name', timezone: 'tz', deletedAt: 'deleted', status: 'status' },
        messages: { id: 'id', conversationId: 'convId', role: 'role', content: 'content', metadata: 'meta', actions: 'actions', createdAt: 'created' },
        conversations: { id: 'id', userId: 'userId', deletedAt: 'deleted' },
        knowledgeItems: { id: 'id', userId: 'userId' },
        memoryConsolidations: {},
      },
      withUserId: vi.fn((userId, callback) => callback(mockDatabaseService.db)),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    mockUserMemoryService = {
      getOrCreate: vi.fn(),
      update: vi.fn(),
      updateLastConsolidatedAt: vi.fn(),
    };

    mockKnowledgeItemsService = {
      add: vi.fn(),
      findById: vi.fn(),
      updateConfidence: vi.fn(),
    };

    mockLLM = {
      chat: vi.fn(),
      getInfo: vi.fn().mockReturnValue({ name: 'test', model: 'test-model' }),
    };

    vi.mocked(createLLMFromEnv).mockReturnValue(mockLLM as unknown as ReturnType<typeof createLLMFromEnv>);

    processor = new MemoryConsolidationProcessor(
      mockDatabaseService as unknown as ConstructorParameters<typeof MemoryConsolidationProcessor>[0],
      mockLogger as unknown as ConstructorParameters<typeof MemoryConsolidationProcessor>[1],
      mockUserMemoryService as unknown as ConstructorParameters<typeof MemoryConsolidationProcessor>[2],
      mockKnowledgeItemsService as unknown as ConstructorParameters<typeof MemoryConsolidationProcessor>[3]
    );
  });

  describe('process', () => {
    it('should_skip_users_with_no_messages', async () => {
      const mockJob = {
        data: {
          timezone: 'America/Sao_Paulo',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ timezone: string; date: string }>;

      // Mock users by timezone
      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'user-123', name: 'Test User', timezone: 'America/Sao_Paulo' },
          ]),
        }),
      });

      // Mock getOrCreate to return memory
      mockUserMemoryService.getOrCreate.mockResolvedValue(createMockUserMemory());

      // Mock messages query - no messages
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test User', timezone: 'America/Sao_Paulo' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

      const result = await processor.process(mockJob);

      expect(result.usersProcessed).toBe(1);
      expect(result.usersSkipped).toBe(1);
      expect(result.usersConsolidated).toBe(0);
      expect(mockLLM.chat).not.toHaveBeenCalled();
    });

    it('should_call_llm_when_messages_exist', async () => {
      const mockJob = {
        data: {
          userId: 'user-123',
          timezone: 'manual',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ userId?: string; timezone: string; date: string }>;

      // Mock user by ID
      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'user-123', name: 'Test User', timezone: 'America/Sao_Paulo' },
          ]),
        }),
      });

      // Mock getOrCreate
      mockUserMemoryService.getOrCreate.mockResolvedValue(createMockUserMemory());

      // Mock messages query - has messages
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test User', timezone: 'America/Sao_Paulo' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hello', metadata: null, actions: null, createdAt: new Date() },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

      // Mock LLM response
      mockLLM.chat.mockResolvedValue({
        content: JSON.stringify({
          memory_updates: {},
          new_knowledge_items: [],
          updated_knowledge_items: [],
        }),
      });

      // Mock insert for log
      mockDatabaseService.db.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await processor.process(mockJob);

      expect(result.usersConsolidated).toBe(1);
      expect(mockLLM.chat).toHaveBeenCalled();
    });

    it('should_apply_memory_updates', async () => {
      const mockJob = {
        data: {
          userId: 'user-123',
          timezone: 'manual',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ userId?: string; timezone: string; date: string }>;

      // Setup mocks for successful processing
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test User', timezone: 'America/Sao_Paulo' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'I work as an engineer', metadata: null, actions: null, createdAt: new Date() },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

      mockUserMemoryService.getOrCreate.mockResolvedValue(createMockUserMemory());

      // Mock LLM response with memory updates
      mockLLM.chat.mockResolvedValue({
        content: JSON.stringify({
          memory_updates: {
            occupation: 'Engineer',
            bio: 'Works in tech',
          },
          new_knowledge_items: [],
          updated_knowledge_items: [],
        }),
      });

      mockDatabaseService.db.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      await processor.process(mockJob);

      expect(mockUserMemoryService.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          occupation: 'Engineer',
          bio: 'Works in tech',
        })
      );
    });

    it('should_create_new_knowledge_items', async () => {
      const mockJob = {
        data: {
          userId: 'user-123',
          timezone: 'manual',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ userId?: string; timezone: string; date: string }>;

      // Setup mocks
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test', timezone: 'UTC' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'I love coffee', metadata: null, actions: null, createdAt: new Date() },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

      mockUserMemoryService.getOrCreate.mockResolvedValue(createMockUserMemory());

      // Mock LLM response with new knowledge items
      mockLLM.chat.mockResolvedValue({
        content: JSON.stringify({
          memory_updates: {},
          new_knowledge_items: [
            {
              type: 'preference',
              content: 'User loves coffee',
              confidence: 0.9,
              source: 'ai_inference',
            },
          ],
          updated_knowledge_items: [],
        }),
      });

      mockKnowledgeItemsService.add.mockResolvedValue({ id: 'new-item-123' });
      mockDatabaseService.db.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      await processor.process(mockJob);

      expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'preference',
          content: 'User loves coffee',
          confidence: 0.9,
          source: 'ai_inference',
        })
      );
    });

    it('should_log_consolidation_on_success', async () => {
      const mockJob = {
        data: {
          userId: 'user-123',
          timezone: 'manual',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ userId?: string; timezone: string; date: string }>;

      // Setup mocks
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test', timezone: 'UTC' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hello', metadata: null, actions: null, createdAt: new Date() },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

      mockUserMemoryService.getOrCreate.mockResolvedValue(createMockUserMemory());
      mockLLM.chat.mockResolvedValue({
        content: JSON.stringify({
          memory_updates: {},
          new_knowledge_items: [],
          updated_knowledge_items: [],
        }),
      });

      const insertValuesMock = vi.fn().mockResolvedValue(undefined);
      mockDatabaseService.db.insert.mockReturnValue({
        values: insertValuesMock,
      });

      await processor.process(mockJob);

      expect(mockDatabaseService.db.insert).toHaveBeenCalled();
      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          status: 'completed',
        })
      );
    });

    it('should_log_consolidation_on_failure', async () => {
      const mockJob = {
        data: {
          userId: 'user-123',
          timezone: 'manual',
          date: '2024-01-15',
        },
        id: 'job-123',
      } as Job<{ userId?: string; timezone: string; date: string }>;

      // Setup mocks - user exists
      mockDatabaseService.db.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'user-123', name: 'Test', timezone: 'UTC' }]),
          }),
        });

      // Mock getOrCreate to throw error
      mockUserMemoryService.getOrCreate.mockRejectedValue(new Error('Database error'));

      const insertValuesMock = vi.fn().mockResolvedValue(undefined);
      mockDatabaseService.db.insert.mockReturnValue({
        values: insertValuesMock,
      });

      const result = await processor.process(mockJob);

      expect(result.errors).toBe(1);
      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          status: 'failed',
          errorMessage: expect.stringContaining('Database error'),
        })
      );
    });
  });

  describe('onCompleted', () => {
    it('should_log_completion', () => {
      const mockJob = {
        id: 'job-123',
        data: { timezone: 'UTC', date: '2024-01-15' },
      } as Job<{ timezone: string; date: string }>;

      const result = {
        usersProcessed: 5,
        usersConsolidated: 3,
        usersSkipped: 2,
        errors: 0,
        completedAt: '2024-01-15T03:00:00Z',
      };

      processor.onCompleted(mockJob, result);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Job job-123 completed',
        { result }
      );
    });
  });

  describe('onFailed', () => {
    it('should_log_failure', () => {
      const mockJob = {
        id: 'job-456',
        attemptsMade: 3,
        data: { timezone: 'UTC', date: '2024-01-15' },
      } as Job<{ timezone: string; date: string }>;

      const error = new Error('LLM timeout');

      processor.onFailed(mockJob, error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Job job-456 failed after 3 attempts: LLM timeout')
      );
    });
  });
});
