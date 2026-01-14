/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifeArea } from '@life-assistant/shared';

// Mock AI package BEFORE imports
vi.mock('@life-assistant/ai', () => ({
  createSuccessResult: vi.fn(
    (toolCall: { id: string }, result: unknown) => ({
      success: true,
      toolCallId: toolCall.id,
      result,
    })
  ),
  createErrorResult: vi.fn(
    (toolCall: { id: string }, error: unknown) => ({
      success: false,
      toolCallId: toolCall.id,
      error: error instanceof Error ? error.message : String(error),
    })
  ),
  searchKnowledgeParamsSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  addKnowledgeParamsSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => ({
      success: true,
      data: { ...data, confidence: (data.confidence as number | undefined) ?? 0.9 },
    })),
  },
  analyzeContextParamsSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}));

import { MemoryToolExecutorService } from '../../../src/modules/memory/application/services/memory-tool-executor.service';
import type { ToolCall } from '@life-assistant/ai';

// Mock data
const mockKnowledgeItems = [
  {
    id: 'ki-1',
    userId: 'user-123',
    type: 'fact',
    area: 'career',
    title: 'Work info',
    content: 'Works as a software developer',
    source: 'conversation',
    confidence: 0.95,
    validatedByUser: false,
    tags: ['work', 'tech'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
  {
    id: 'ki-2',
    userId: 'user-123',
    type: 'fact',
    area: 'relationships',
    title: 'Relationship status',
    content: 'Is single and lives alone',
    source: 'conversation',
    confidence: 0.9,
    validatedByUser: false,
    tags: ['status'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  },
  {
    id: 'ki-3',
    userId: 'user-123',
    type: 'insight',
    area: 'mental_health',
    title: 'Stress pattern',
    content: 'Gets stressed before deadlines',
    source: 'ai_inference',
    confidence: 0.75,
    validatedByUser: false,
    tags: ['stress', 'work'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    deletedAt: null,
  },
];

const mockUserMemory = {
  id: 'mem-123',
  userId: 'user-123',
  bio: 'Test user bio',
  occupation: 'Developer',
  familyContext: null,
  currentGoals: [],
  currentChallenges: [],
  topOfMind: [],
  values: [],
  communicationStyle: null,
  feedbackPreferences: null,
  christianPerspective: false,
  learnedPatterns: [
    {
      pattern: 'Fica ansioso antes de reuniões importantes',
      confidence: 0.8,
      evidence: ['mentioned anxiety', 'mentioned meetings'],
    },
    {
      pattern: 'Prefere trabalhar de manhã',
      confidence: 0.65,
      evidence: ['mentioned morning routine'],
    },
  ],
  version: 1,
  lastConsolidatedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Memory Tool Executor (Integration)', () => {
  let executor: MemoryToolExecutorService;
  let mockKnowledgeItemsService: {
    search: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    findByArea: ReturnType<typeof vi.fn>;
  };
  let mockUserMemoryService: {
    getOrCreate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockKnowledgeItemsService = {
      search: vi.fn(),
      add: vi.fn(),
      findByArea: vi.fn(),
    };

    mockUserMemoryService = {
      getOrCreate: vi.fn(),
    };

    // Directly instantiate the service with mocks (like unit tests)
    executor = new MemoryToolExecutorService(
      mockKnowledgeItemsService as unknown as ConstructorParameters<typeof MemoryToolExecutorService>[0],
      mockUserMemoryService as unknown as ConstructorParameters<typeof MemoryToolExecutorService>[1]
    );
  });

  describe('search_knowledge tool', () => {
    it('should_return_relevant_items_for_query', async () => {
      mockKnowledgeItemsService.search.mockResolvedValue([mockKnowledgeItems[0]]);

      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'search_knowledge',
        arguments: { query: 'developer' },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        count: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            id: 'ki-1',
            type: 'fact',
            area: 'career',
          }),
        ]),
      });
      expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ query: 'developer' })
      );
    });

    it('should_filter_by_area', async () => {
      mockKnowledgeItemsService.search.mockResolvedValue([mockKnowledgeItems[1]]);

      const toolCall: ToolCall = {
        id: 'call-2',
        name: 'search_knowledge',
        arguments: { area: 'relationships' },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        count: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            area: 'relationships',
          }),
        ]),
      });
    });

    it('should_filter_by_type', async () => {
      mockKnowledgeItemsService.search.mockResolvedValue([mockKnowledgeItems[2]]);

      const toolCall: ToolCall = {
        id: 'call-3',
        name: 'search_knowledge',
        arguments: { type: 'insight' },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        count: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            type: 'insight',
          }),
        ]),
      });
    });

    it('should_return_empty_array_for_no_matches', async () => {
      mockKnowledgeItemsService.search.mockResolvedValue([]);

      const toolCall: ToolCall = {
        id: 'call-4',
        name: 'search_knowledge',
        arguments: { query: 'nonexistent' },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        count: 0,
        results: [],
      });
    });

    it('should_respect_limit_parameter', async () => {
      mockKnowledgeItemsService.search.mockResolvedValue([mockKnowledgeItems[0]]);

      const toolCall: ToolCall = {
        id: 'call-5',
        name: 'search_knowledge',
        arguments: { limit: 5 },
      };

      await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('add_knowledge tool', () => {
    it('should_create_knowledge_item_successfully', async () => {
      const newItem = {
        id: 'ki-new',
        userId: 'user-123',
        type: 'fact',
        area: 'career',
        title: 'New fact',
        content: 'Just got promoted',
        source: 'conversation',
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockKnowledgeItemsService.add.mockResolvedValue(newItem);

      const toolCall: ToolCall = {
        id: 'call-6',
        name: 'add_knowledge',
        arguments: {
          type: 'fact',
          content: 'Just got promoted',
          area: 'career',
          confidence: 0.9,
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        success: true,
        itemId: 'ki-new',
      });
    });

    it('should_set_default_confidence_when_not_provided', async () => {
      const newItem = {
        id: 'ki-new-2',
        userId: 'user-123',
        type: 'fact',
        title: 'Another fact',
        content: 'Some content',
        source: 'conversation',
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockKnowledgeItemsService.add.mockResolvedValue(newItem);

      const toolCall: ToolCall = {
        id: 'call-7',
        name: 'add_knowledge',
        arguments: {
          type: 'fact',
          content: 'Some content',
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      // Default confidence is 0.9 per schema
      expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          confidence: 0.9,
        })
      );
    });

    it('should_validate_required_parameters', async () => {
      const toolCall: ToolCall = {
        id: 'call-8',
        name: 'add_knowledge',
        arguments: {
          // Missing required 'type' and 'content'
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should_include_conversationId_as_sourceRef', async () => {
      const newItem = {
        id: 'ki-new-3',
        userId: 'user-123',
        type: 'fact',
        title: 'Fact with ref',
        content: 'Content',
        source: 'conversation',
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockKnowledgeItemsService.add.mockResolvedValue(newItem);

      const toolCall: ToolCall = {
        id: 'call-9',
        name: 'add_knowledge',
        arguments: {
          type: 'fact',
          content: 'Content',
        },
      };

      await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-456',
      });

      expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          sourceRef: 'conv-456',
        })
      );
    });
  });

  describe('analyze_context tool', () => {
    it('should_return_related_facts_by_area', async () => {
      mockKnowledgeItemsService.findByArea.mockImplementation(
        (userId: string, area: string) => {
          if (area === 'relationships') {
            return Promise.resolve([mockKnowledgeItems[1]]);
          }
          if (area === 'mental_health') {
            return Promise.resolve([mockKnowledgeItems[2]]);
          }
          return Promise.resolve([]);
        }
      );
      mockUserMemoryService.getOrCreate.mockResolvedValue(mockUserMemory);

      const toolCall: ToolCall = {
        id: 'call-10',
        name: 'analyze_context',
        arguments: {
          currentTopic: 'ending relationship',
          relatedAreas: [LifeArea.RELATIONSHIPS, LifeArea.MENTAL_HEALTH],
          lookForContradictions: true,
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        relatedFacts: expect.arrayContaining([
          expect.objectContaining({ area: 'relationships' }),
          expect.objectContaining({ area: 'mental_health' }),
        ]),
      });
    });

    it('should_return_learned_patterns', async () => {
      mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
      mockUserMemoryService.getOrCreate.mockResolvedValue(mockUserMemory);

      const toolCall: ToolCall = {
        id: 'call-11',
        name: 'analyze_context',
        arguments: {
          currentTopic: 'important meeting tomorrow',
          relatedAreas: [LifeArea.CAREER],
          lookForContradictions: false,
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      // Should return patterns with confidence >= 0.7
      expect(result.result).toMatchObject({
        existingPatterns: expect.arrayContaining([
          expect.objectContaining({
            pattern: 'Fica ansioso antes de reuniões importantes',
            confidence: 0.8,
          }),
        ]),
      });
      // Pattern with 0.65 confidence should be filtered out
      expect((result.result as { existingPatterns: { confidence: number }[] }).existingPatterns).not.toContainEqual(
        expect.objectContaining({ confidence: 0.65 })
      );
    });

    it('should_return_empty_when_no_context', async () => {
      mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
      mockUserMemoryService.getOrCreate.mockResolvedValue({
        ...mockUserMemory,
        learnedPatterns: [],
      });

      const toolCall: ToolCall = {
        id: 'call-12',
        name: 'analyze_context',
        arguments: {
          currentTopic: 'random topic',
          relatedAreas: [LifeArea.HOBBIES],
          lookForContradictions: true,
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        relatedFacts: [],
        existingPatterns: [],
        potentialConnections: [],
        contradictions: [],
      });
    });

    it('should_validate_required_parameters', async () => {
      const toolCall: ToolCall = {
        id: 'call-13',
        name: 'analyze_context',
        arguments: {
          // Missing required parameters
        },
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Unknown tool', () => {
    it('should_return_error_for_unknown_tool', async () => {
      const toolCall: ToolCall = {
        id: 'call-14',
        name: 'unknown_tool',
        arguments: {},
      };

      const result = await executor.execute(toolCall, {
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });
});
