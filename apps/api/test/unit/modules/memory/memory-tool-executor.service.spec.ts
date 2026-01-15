import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AI package
vi.mock('@life-assistant/ai', () => ({
  createSuccessResult: vi.fn((toolCall, result) => ({
    status: 'success',
    toolCallId: toolCall.id,
    output: result,
  })),
  createErrorResult: vi.fn((toolCall, error) => ({
    status: 'error',
    toolCallId: toolCall.id,
    error: error instanceof Error ? error.message : String(error),
  })),
  searchKnowledgeParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  addKnowledgeParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  analyzeContextParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
}));

import { MemoryToolExecutorService } from '../../../../src/modules/memory/application/services/memory-tool-executor.service.js';
import {
  createSuccessResult,
  createErrorResult,
  searchKnowledgeParamsSchema,
  addKnowledgeParamsSchema,
  analyzeContextParamsSchema,
} from '@life-assistant/ai';
import type { ToolCall } from '@life-assistant/ai';
import type { KnowledgeItem } from '@life-assistant/database';

/**
 * Create a mock tool call
 */
function createMockToolCall(
  overrides: Partial<ToolCall> = {}
): ToolCall {
  return {
    id: 'tool-call-123',
    name: 'search_knowledge',
    arguments: {},
    ...overrides,
  };
}

/**
 * Create a mock knowledge item
 */
function createMockKnowledgeItem(
  overrides: Partial<KnowledgeItem> = {}
): KnowledgeItem {
  return {
    id: 'item-123',
    userId: 'user-123',
    type: 'fact',
    area: 'personal_growth',
    title: 'Test fact',
    content: 'This is test content',
    confidence: 0.9,
    source: 'conversation',
    sourceRef: null,
    inferenceEvidence: null,
    tags: [],
    validatedByUser: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

describe('MemoryToolExecutorService', () => {
  let memoryToolExecutor: MemoryToolExecutorService;
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

    memoryToolExecutor = new MemoryToolExecutorService(
      mockKnowledgeItemsService as unknown as ConstructorParameters<typeof MemoryToolExecutorService>[0],
      mockUserMemoryService as unknown as ConstructorParameters<typeof MemoryToolExecutorService>[1]
    );
  });

  describe('execute', () => {
    describe('search_knowledge', () => {
      it('should_return_search_results', async () => {
        const mockItems = [
          createMockKnowledgeItem({ id: 'item-1', title: 'First item' }),
          createMockKnowledgeItem({ id: 'item-2', title: 'Second item' }),
        ];
        mockKnowledgeItemsService.search.mockResolvedValue(mockItems);

        const toolCall = createMockToolCall({
          name: 'search_knowledge',
          arguments: { query: 'test query' },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ query: 'test query' })
        );
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            count: 2,
            results: expect.arrayContaining([
              expect.objectContaining({ id: 'item-1' }),
              expect.objectContaining({ id: 'item-2' }),
            ]),
          })
        );
      });

      it('should_pass_type_filter_to_search', async () => {
        mockKnowledgeItemsService.search.mockResolvedValue([]);

        const toolCall = createMockToolCall({
          name: 'search_knowledge',
          arguments: { query: 'test', type: 'preference' },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ type: 'preference' })
        );
      });

      it('should_pass_area_filter_to_search', async () => {
        mockKnowledgeItemsService.search.mockResolvedValue([]);

        const toolCall = createMockToolCall({
          name: 'search_knowledge',
          arguments: { query: 'test', area: 'health' },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ area: 'health' })
        );
      });

      it('should_pass_limit_to_search', async () => {
        mockKnowledgeItemsService.search.mockResolvedValue([]);

        const toolCall = createMockToolCall({
          name: 'search_knowledge',
          arguments: { query: 'test', limit: 10 },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.search).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ limit: 10 })
        );
      });

      it('should_return_error_on_invalid_params', async () => {
        vi.mocked(searchKnowledgeParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid query' },
        } as unknown as ReturnType<typeof searchKnowledgeParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'search_knowledge',
          arguments: {},
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });
    });

    describe('add_knowledge', () => {
      it('should_create_knowledge_item', async () => {
        const mockItem = createMockKnowledgeItem({
          id: 'new-item',
          title: 'New knowledge',
        });
        mockKnowledgeItemsService.add.mockResolvedValue({ item: mockItem });

        const toolCall = createMockToolCall({
          name: 'add_knowledge',
          arguments: {
            type: 'fact',
            content: 'Test content',
          },
        });

        await memoryToolExecutor.execute(toolCall, {
          userId: 'user-123',
          conversationId: 'conv-123',
        });

        expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            type: 'fact',
            content: 'Test content',
            source: 'conversation',
            sourceRef: 'conv-123',
          })
        );
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            success: true,
            itemId: 'new-item',
          })
        );
      });

      it('should_pass_area_when_provided', async () => {
        const mockItem = createMockKnowledgeItem();
        mockKnowledgeItemsService.add.mockResolvedValue({ item: mockItem });

        const toolCall = createMockToolCall({
          name: 'add_knowledge',
          arguments: {
            type: 'fact',
            content: 'Test',
            area: 'health',
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ area: 'health' })
        );
      });

      it('should_pass_confidence_when_provided', async () => {
        const mockItem = createMockKnowledgeItem();
        mockKnowledgeItemsService.add.mockResolvedValue({ item: mockItem });

        const toolCall = createMockToolCall({
          name: 'add_knowledge',
          arguments: {
            type: 'fact',
            content: 'Test',
            confidence: 0.8,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ confidence: 0.8 })
        );
      });

      it('should_return_error_on_invalid_params', async () => {
        vi.mocked(addKnowledgeParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid type' },
        } as unknown as ReturnType<typeof addKnowledgeParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'add_knowledge',
          arguments: {},
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });
    });

    describe('unknown tool', () => {
      it('should_return_error_for_unknown_tool', async () => {
        const toolCall = createMockToolCall({
          name: 'unknown_tool',
          arguments: {},
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });
    });

    describe('analyze_context', () => {
      it('should_return_related_facts_from_areas', async () => {
        const mockItems = [
          createMockKnowledgeItem({
            id: 'item-1',
            content: 'User has debt',
            area: 'financial',
            confidence: 0.9,
          }),
          createMockKnowledgeItem({
            id: 'item-2',
            content: 'User sleeps poorly',
            area: 'health',
            confidence: 0.85,
          }),
        ];
        mockKnowledgeItemsService.findByArea
          .mockResolvedValueOnce([mockItems[0]]) // financial
          .mockResolvedValueOnce([mockItems[1]]); // health

        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'sleeping problems',
            relatedAreas: ['financial', 'health'],
            lookForContradictions: true,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockKnowledgeItemsService.findByArea).toHaveBeenCalledTimes(2);
        expect(mockKnowledgeItemsService.findByArea).toHaveBeenCalledWith('user-123', 'financial', 10);
        expect(mockKnowledgeItemsService.findByArea).toHaveBeenCalledWith('user-123', 'health', 10);
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            relatedFacts: expect.arrayContaining([
              expect.objectContaining({ id: 'item-1' }),
              expect.objectContaining({ id: 'item-2' }),
            ]),
          })
        );
      });

      it('should_include_learned_patterns_with_high_confidence', async () => {
        mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [
            { pattern: 'Gets anxious before meetings', confidence: 0.85, evidence: ['ev1'] },
            { pattern: 'Prefers morning tasks', confidence: 0.6, evidence: ['ev2'] }, // Below threshold
          ],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'tomorrow meeting',
            relatedAreas: ['career'],
            lookForContradictions: false,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            existingPatterns: expect.arrayContaining([
              expect.objectContaining({ pattern: 'Gets anxious before meetings' }),
            ]),
          })
        );
        // Verify low-confidence pattern is excluded
        const result = vi.mocked(createSuccessResult).mock.calls[0]?.[1] as {
          existingPatterns: Array<{ pattern: string }>;
        };
        expect(result.existingPatterns).toHaveLength(1);
      });

      it('should_deduplicate_facts_from_multiple_areas', async () => {
        const sharedItem = createMockKnowledgeItem({
          id: 'shared-item',
          content: 'Shared concern',
          confidence: 0.9,
        });
        mockKnowledgeItemsService.findByArea
          .mockResolvedValueOnce([sharedItem]) // First area
          .mockResolvedValueOnce([sharedItem]); // Second area (same item)

        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'life stress',
            relatedAreas: ['mental_health', 'career'],
            lookForContradictions: false,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        const result = vi.mocked(createSuccessResult).mock.calls[0]?.[1] as {
          relatedFacts: Array<{ id: string }>;
        };
        expect(result.relatedFacts).toHaveLength(1);
        expect(result.relatedFacts[0]?.id).toBe('shared-item');
      });

      it('should_find_potential_connections_with_patterns', async () => {
        mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [
            { pattern: 'Gets stressed before meetings', confidence: 0.8, evidence: ['ev1'] },
          ],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'feeling stressed about tomorrow',
            relatedAreas: ['mental_health'],
            lookForContradictions: true,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            potentialConnections: expect.arrayContaining([
              expect.stringContaining('stressed'),
            ]),
          })
        );
      });

      it('should_include_hint_when_lookForContradictions_is_true', async () => {
        mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'test topic',
            relatedAreas: ['personal_growth'],
            lookForContradictions: true,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            _hint: expect.stringContaining('contradições'),
          })
        );
      });

      it('should_not_include_hint_when_lookForContradictions_is_false', async () => {
        mockKnowledgeItemsService.findByArea.mockResolvedValue([]);
        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'test topic',
            relatedAreas: ['personal_growth'],
            lookForContradictions: false,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        const result = vi.mocked(createSuccessResult).mock.calls[0]?.[1] as {
          _hint: string | undefined;
        };
        expect(result._hint).toBeUndefined();
      });

      it('should_return_error_on_invalid_params', async () => {
        vi.mocked(analyzeContextParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid topic' },
        } as unknown as ReturnType<typeof analyzeContextParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {},
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });

      it('should_sort_facts_by_confidence_descending', async () => {
        mockKnowledgeItemsService.findByArea.mockResolvedValue([
          createMockKnowledgeItem({ id: 'low', confidence: 0.5 }),
          createMockKnowledgeItem({ id: 'high', confidence: 0.95 }),
          createMockKnowledgeItem({ id: 'medium', confidence: 0.75 }),
        ]);
        mockUserMemoryService.getOrCreate.mockResolvedValue({
          learnedPatterns: [],
        });

        const toolCall = createMockToolCall({
          name: 'analyze_context',
          arguments: {
            currentTopic: 'test',
            relatedAreas: ['health'],
            lookForContradictions: false,
          },
        });

        await memoryToolExecutor.execute(toolCall, { userId: 'user-123' });

        const result = vi.mocked(createSuccessResult).mock.calls[0]?.[1] as {
          relatedFacts: Array<{ id: string; confidence: number }>;
        };
        expect(result.relatedFacts[0]?.id).toBe('high');
        expect(result.relatedFacts[1]?.id).toBe('medium');
        expect(result.relatedFacts[2]?.id).toBe('low');
      });
    });

  });
});
