import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeItemsService } from '../../../../src/modules/memory/application/services/knowledge-items.service.js';
import type { ContradictionResolutionService } from '../../../../src/modules/memory/application/services/contradiction-resolution.service.js';
import type { KnowledgeItem } from '@life-assistant/database';

/**
 * Create a mock knowledge item for testing
 */
function createMockKnowledgeItem(
  overrides: Partial<KnowledgeItem> = {}
): KnowledgeItem {
  return {
    id: 'item-123',
    userId: 'user-123',
    type: 'fact',
    area: 'learning',
    title: 'Test fact',
    content: 'This is test content',
    confidence: 0.9,
    source: 'conversation',
    sourceRef: null,
    inferenceEvidence: null,
    tags: [],
    validatedByUser: false,
    supersededById: null,
    supersededAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

describe('KnowledgeItemsService', () => {
  let knowledgeItemsService: KnowledgeItemsService;
  let mockRepository: {
    search: ReturnType<typeof vi.fn>;
    countSearch: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByType: ReturnType<typeof vi.fn>;
    findByArea: ReturnType<typeof vi.fn>;
    countByArea: ReturnType<typeof vi.fn>;
    countByType: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findActiveBySameScope: ReturnType<typeof vi.fn>;
    supersede: ReturnType<typeof vi.fn>;
    findSuperseded: ReturnType<typeof vi.fn>;
  };
  let mockContradictionResolution: {
    checkBeforeAdd: ReturnType<typeof vi.fn>;
    resolve: ReturnType<typeof vi.fn>;
    findContradictionsInGroup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      search: vi.fn(),
      countSearch: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByType: vi.fn(),
      findByArea: vi.fn(),
      countByArea: vi.fn(),
      countByType: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findActiveBySameScope: vi.fn(),
      supersede: vi.fn(),
      findSuperseded: vi.fn(),
    };

    mockContradictionResolution = {
      checkBeforeAdd: vi.fn().mockResolvedValue({ shouldSupersede: null, explanation: null }),
      resolve: vi.fn().mockResolvedValue(undefined),
      findContradictionsInGroup: vi.fn().mockResolvedValue([]),
    };

    knowledgeItemsService = new KnowledgeItemsService(
      mockRepository as unknown as ConstructorParameters<typeof KnowledgeItemsService>[0],
      mockContradictionResolution as unknown as ContradictionResolutionService
    );
  });

  describe('search', () => {
    it('should_search_by_query', async () => {
      const mockItems = [createMockKnowledgeItem()];
      mockRepository.search.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.search('user-123', {
        query: 'test query',
      });

      expect(result).toEqual(mockItems);
      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        query: 'test query',
        limit: 5,
      });
    });

    it('should_search_with_type_filter', async () => {
      const mockItems = [createMockKnowledgeItem({ type: 'preference' })];
      mockRepository.search.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.search('user-123', {
        type: 'preference',
      });

      expect(result).toEqual(mockItems);
      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        type: 'preference',
        limit: 5,
      });
    });

    it('should_search_with_area_filter', async () => {
      const mockItems = [createMockKnowledgeItem({ area: 'health' })];
      mockRepository.search.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.search('user-123', {
        area: 'health',
      });

      expect(result).toEqual(mockItems);
      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        area: 'health',
        limit: 5,
      });
    });

    it('should_search_with_custom_limit', async () => {
      const mockItems = [createMockKnowledgeItem()];
      mockRepository.search.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.search('user-123', {
        query: 'test',
        limit: 10,
      });

      expect(result).toEqual(mockItems);
      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        query: 'test',
        limit: 10,
      });
    });

    it('should_use_default_limit_of_5', async () => {
      mockRepository.search.mockResolvedValue([]);

      await knowledgeItemsService.search('user-123', {});

      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        limit: 5,
      });
    });
  });

  describe('add', () => {
    it('should_create_item_with_all_params', async () => {
      const mockItem = createMockKnowledgeItem({
        type: 'fact',
        area: 'professional',
        title: 'Custom title',
        content: 'Test content',
      });
      mockRepository.create.mockResolvedValue(mockItem);

      const result = await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test content',
        area: 'professional',
        title: 'Custom title',
        confidence: 0.85,
        source: 'conversation',
      });

      expect(result.item).toEqual(mockItem);
      expect(result.superseded).toBeUndefined();
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        type: 'fact',
        content: 'Test content',
        area: 'professional',
        title: 'Custom title',
        confidence: 0.85,
        source: 'conversation',
        sourceRef: undefined,
        inferenceEvidence: undefined,
        tags: [],
      });
    });

    it('should_generate_title_when_not_provided', async () => {
      const mockItem = createMockKnowledgeItem({
        title: 'Fato: This is a test content',
      });
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'This is a test content',
        source: 'conversation',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          title: expect.stringContaining('Fato:'),
        })
      );
    });

    it('should_generate_title_for_preference_type', async () => {
      const mockItem = createMockKnowledgeItem({ type: 'preference' });
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'preference',
        content: 'Likes coffee',
        source: 'conversation',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          title: expect.stringContaining('Preferência:'),
        })
      );
    });

    it('should_clamp_confidence_to_min_0', async () => {
      const mockItem = createMockKnowledgeItem({ confidence: 0 });
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test',
        confidence: -0.5,
        source: 'conversation',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          confidence: 0,
        })
      );
    });

    it('should_clamp_confidence_to_max_1', async () => {
      const mockItem = createMockKnowledgeItem({ confidence: 1 });
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test',
        confidence: 1.5,
        source: 'conversation',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          confidence: 1,
        })
      );
    });

    it('should_default_confidence_to_0.9', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test',
        source: 'conversation',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          confidence: 0.9,
        })
      );
    });

    it('should_include_source_ref_when_provided', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test',
        source: 'conversation',
        sourceRef: 'conv-123',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          sourceRef: 'conv-123',
        })
      );
    });

    it('should_include_inference_evidence_when_provided', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'insight',
        content: 'Test insight',
        source: 'ai_inference',
        inferenceEvidence: 'Based on 3 conversations',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-123',
        expect.objectContaining({
          inferenceEvidence: 'Based on 3 conversations',
        })
      );
    });

    it('should_check_for_contradictions_before_adding', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'User is in a relationship',
        area: 'relationships',
        source: 'conversation',
      });

      expect(mockContradictionResolution.checkBeforeAdd).toHaveBeenCalledWith(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );
    });

    it('should_return_superseded_info_when_contradiction_found', async () => {
      const existingItem = createMockKnowledgeItem({
        id: 'old-item',
        content: 'User is single',
      });
      const newItem = createMockKnowledgeItem({
        id: 'new-item',
        content: 'User is in a relationship',
      });

      mockContradictionResolution.checkBeforeAdd.mockResolvedValue({
        shouldSupersede: existingItem,
        explanation: 'Single contradicts relationship',
      });
      mockRepository.create.mockResolvedValue(newItem);

      const result = await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'User is in a relationship',
        area: 'relationships',
        source: 'conversation',
      });

      expect(result.item).toEqual(newItem);
      expect(result.superseded).toBeDefined();
      expect(result.superseded?.supersededItemId).toBe('old-item');
      expect(result.superseded?.supersededContent).toBe('User is single');
      expect(result.superseded?.reason).toBe('Single contradicts relationship');
    });

    it('should_resolve_contradiction_after_creating_item', async () => {
      const existingItem = createMockKnowledgeItem({
        id: 'old-item',
        content: 'User is single',
      });
      const newItem = createMockKnowledgeItem({
        id: 'new-item',
        content: 'User is in a relationship',
      });

      mockContradictionResolution.checkBeforeAdd.mockResolvedValue({
        shouldSupersede: existingItem,
        explanation: 'Single contradicts relationship',
      });
      mockRepository.create.mockResolvedValue(newItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'User is in a relationship',
        area: 'relationships',
        source: 'conversation',
      });

      expect(mockContradictionResolution.resolve).toHaveBeenCalledWith(
        'user-123',
        'old-item',
        'new-item',
        'Single contradicts relationship'
      );
    });

    it('should_skip_contradiction_check_when_skipContradictionCheck_is_true', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.create.mockResolvedValue(mockItem);

      await knowledgeItemsService.add('user-123', {
        type: 'fact',
        content: 'Test',
        source: 'conversation',
        skipContradictionCheck: true,
      });

      expect(mockContradictionResolution.checkBeforeAdd).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should_return_paginated_list', async () => {
      const mockItems = [
        createMockKnowledgeItem({ id: 'item-1' }),
        createMockKnowledgeItem({ id: 'item-2' }),
      ];
      mockRepository.search.mockResolvedValue(mockItems);
      mockRepository.countSearch.mockResolvedValue(10);

      const result = await knowledgeItemsService.list('user-123', {
        limit: 2,
        offset: 0,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should_return_hasMore_false_when_no_more_items', async () => {
      const mockItems = [createMockKnowledgeItem()];
      mockRepository.search.mockResolvedValue(mockItems);
      mockRepository.countSearch.mockResolvedValue(1);

      const result = await knowledgeItemsService.list('user-123', {
        limit: 20,
        offset: 0,
      });

      expect(result.hasMore).toBe(false);
    });

    it('should_filter_by_type', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.countSearch.mockResolvedValue(0);

      await knowledgeItemsService.list('user-123', { type: 'preference' });

      expect(mockRepository.search).toHaveBeenCalledWith('user-123',
        expect.objectContaining({ type: 'preference' })
      );
    });

    it('should_filter_by_area', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.countSearch.mockResolvedValue(0);

      await knowledgeItemsService.list('user-123', { area: 'health' });

      expect(mockRepository.search).toHaveBeenCalledWith('user-123',
        expect.objectContaining({ area: 'health' })
      );
    });

    it('should_use_default_pagination', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.countSearch.mockResolvedValue(0);

      await knowledgeItemsService.list('user-123');

      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('delete', () => {
    it('should_soft_delete_item', async () => {
      mockRepository.softDelete.mockResolvedValue(true);

      const result = await knowledgeItemsService.delete('user-123', 'item-123');

      expect(result).toBe(true);
      expect(mockRepository.softDelete).toHaveBeenCalledWith('user-123', 'item-123');
    });

    it('should_return_false_when_item_not_found', async () => {
      mockRepository.softDelete.mockResolvedValue(false);

      const result = await knowledgeItemsService.delete('user-123', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should_mark_item_as_validated', async () => {
      const validatedItem = createMockKnowledgeItem({
        validatedByUser: true,
        confidence: 1.0,
      });
      mockRepository.update.mockResolvedValue(validatedItem);

      const result = await knowledgeItemsService.validate('user-123', 'item-123');

      expect(result).toEqual(validatedItem);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'item-123',
        { validatedByUser: true, confidence: 1.0 }
      );
    });

    it('should_return_null_when_item_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await knowledgeItemsService.validate('user-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateConfidence', () => {
    it('should_update_confidence_value', async () => {
      const updatedItem = createMockKnowledgeItem({ confidence: 0.75 });
      mockRepository.update.mockResolvedValue(updatedItem);

      const result = await knowledgeItemsService.updateConfidence(
        'user-123',
        'item-123',
        0.75
      );

      expect(result).toEqual(updatedItem);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'item-123',
        { confidence: 0.75 }
      );
    });

    it('should_clamp_confidence_to_min_0', async () => {
      const updatedItem = createMockKnowledgeItem({ confidence: 0 });
      mockRepository.update.mockResolvedValue(updatedItem);

      await knowledgeItemsService.updateConfidence('user-123', 'item-123', -0.5);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'item-123',
        { confidence: 0 }
      );
    });

    it('should_clamp_confidence_to_max_1', async () => {
      const updatedItem = createMockKnowledgeItem({ confidence: 1 });
      mockRepository.update.mockResolvedValue(updatedItem);

      await knowledgeItemsService.updateConfidence('user-123', 'item-123', 1.5);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'item-123',
        { confidence: 1 }
      );
    });
  });

  describe('findById', () => {
    it('should_return_item_when_found', async () => {
      const mockItem = createMockKnowledgeItem();
      mockRepository.findById.mockResolvedValue(mockItem);

      const result = await knowledgeItemsService.findById('user-123', 'item-123');

      expect(result).toEqual(mockItem);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'item-123');
    });

    it('should_return_null_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await knowledgeItemsService.findById('user-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should_return_items_by_type', async () => {
      const mockItems = [createMockKnowledgeItem({ type: 'fact' })];
      mockRepository.findByType.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.findByType('user-123', 'fact');

      expect(result).toEqual(mockItems);
      expect(mockRepository.findByType).toHaveBeenCalledWith('user-123', 'fact', undefined);
    });

    it('should_accept_limit_parameter', async () => {
      mockRepository.findByType.mockResolvedValue([]);

      await knowledgeItemsService.findByType('user-123', 'fact', 10);

      expect(mockRepository.findByType).toHaveBeenCalledWith('user-123', 'fact', 10);
    });
  });

  describe('findByArea', () => {
    it('should_return_items_by_area', async () => {
      const mockItems = [createMockKnowledgeItem({ area: 'health' })];
      mockRepository.findByArea.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.findByArea('user-123', 'health');

      expect(result).toEqual(mockItems);
      expect(mockRepository.findByArea).toHaveBeenCalledWith('user-123', 'health', undefined);
    });

    it('should_accept_limit_parameter', async () => {
      mockRepository.findByArea.mockResolvedValue([]);

      await knowledgeItemsService.findByArea('user-123', 'health', 10);

      expect(mockRepository.findByArea).toHaveBeenCalledWith('user-123', 'health', 10);
    });
  });

  describe('update', () => {
    it('should_update_item_with_all_fields', async () => {
      const updatedItem = createMockKnowledgeItem({
        title: 'Updated title',
        content: 'Updated content',
        tags: ['tag1', 'tag2'],
      });
      mockRepository.update.mockResolvedValue(updatedItem);

      const result = await knowledgeItemsService.update('user-123', 'item-123', {
        title: 'Updated title',
        content: 'Updated content',
        tags: ['tag1', 'tag2'],
      });

      expect(result).toEqual(updatedItem);
      // Manual edit = implicit confirmation (maximum protection)
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'item-123', {
        title: 'Updated title',
        content: 'Updated content',
        tags: ['tag1', 'tag2'],
        validatedByUser: true,
        confidence: 1.0,
      });
    });

    it('should_update_item_with_partial_fields', async () => {
      const updatedItem = createMockKnowledgeItem({ title: 'New title' });
      mockRepository.update.mockResolvedValue(updatedItem);

      const result = await knowledgeItemsService.update('user-123', 'item-123', {
        title: 'New title',
      });

      expect(result).toEqual(updatedItem);
      // Manual edit = implicit confirmation (maximum protection)
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'item-123', {
        title: 'New title',
        validatedByUser: true,
        confidence: 1.0,
      });
    });

    it('should_return_existing_item_when_no_updates_provided', async () => {
      const existingItem = createMockKnowledgeItem();
      mockRepository.findById.mockResolvedValue(existingItem);

      const result = await knowledgeItemsService.update('user-123', 'item-123', {});

      expect(result).toEqual(existingItem);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'item-123');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_return_null_when_item_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await knowledgeItemsService.update('user-123', 'nonexistent', {
        title: 'New title',
      });

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should_return_stats_with_counts_by_area_and_type', async () => {
      mockRepository.countByArea.mockResolvedValue({
        health: 5,
        finance: 3,
        professional: 8,
        learning: 4,
        spiritual: 0,
        relationships: 2,
      });
      mockRepository.countByType.mockResolvedValue({
        fact: 10,
        preference: 8,
        memory: 3,
        insight: 2,
        person: 2,
      });

      const result = await knowledgeItemsService.getStats('user-123');

      expect(result).toEqual({
        byArea: {
          health: 5,
          finance: 3,
          professional: 8,
          learning: 4,
          spiritual: 0,
          relationships: 2,
        },
        byType: {
          fact: 10,
          preference: 8,
          memory: 3,
          insight: 2,
          person: 2,
        },
        total: 25, // Sum of byType counts
      });
    });

    it('should_return_zero_counts_for_empty_user', async () => {
      mockRepository.countByArea.mockResolvedValue({
        health: 0,
        finance: 0,
        professional: 0,
        learning: 0,
        spiritual: 0,
        relationships: 0,
      });
      mockRepository.countByType.mockResolvedValue({
        fact: 0,
        preference: 0,
        memory: 0,
        insight: 0,
        person: 0,
      });

      const result = await knowledgeItemsService.getStats('user-123');

      expect(result.total).toBe(0);
    });
  });

  describe('exportAll', () => {
    it('should_return_all_items_including_superseded_with_stats', async () => {
      const mockItems = [
        createMockKnowledgeItem({ id: 'item-1', supersededById: null }),
        createMockKnowledgeItem({ id: 'item-2', supersededById: null }),
        createMockKnowledgeItem({ id: 'item-3', supersededById: 'item-2', supersededAt: new Date() }),
      ];
      mockRepository.search.mockResolvedValue(mockItems);

      const result = await knowledgeItemsService.exportAll('user-123');

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(3);
      expect(result.stats.active).toBe(2);
      expect(result.stats.superseded).toBe(1);
      expect(result.exportedAt).toBeDefined();
      expect(mockRepository.search).toHaveBeenCalledWith('user-123', {
        includeSuperseded: true,
        limit: 10000,
      });
    });

    it('should_return_empty_export_when_no_items', async () => {
      mockRepository.search.mockResolvedValue([]);

      const result = await knowledgeItemsService.exportAll('user-123');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.stats.active).toBe(0);
      expect(result.stats.superseded).toBe(0);
    });
  });

  describe('list with includeSuperseded', () => {
    it('should_pass_includeSuperseded_to_repository_when_true', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.countSearch.mockResolvedValue(0);

      await knowledgeItemsService.list('user-123', { includeSuperseded: true });

      expect(mockRepository.search).toHaveBeenCalledWith('user-123',
        expect.objectContaining({ includeSuperseded: true })
      );
      expect(mockRepository.countSearch).toHaveBeenCalledWith('user-123',
        expect.objectContaining({ includeSuperseded: true })
      );
    });

    it('should_not_include_superseded_by_default', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.countSearch.mockResolvedValue(0);

      await knowledgeItemsService.list('user-123', {});

      // Should not have includeSuperseded in the call
      const searchCall = mockRepository.search.mock.calls[0][1];
      expect(searchCall.includeSuperseded).toBeUndefined();
    });

    it('should_return_superseded_items_when_includeSuperseded_is_true', async () => {
      const mockItems = [
        createMockKnowledgeItem({ id: 'item-1', supersededById: null }),
        createMockKnowledgeItem({ id: 'item-2', supersededById: 'item-1', supersededAt: new Date() }),
      ];
      mockRepository.search.mockResolvedValue(mockItems);
      mockRepository.countSearch.mockResolvedValue(2);

      const result = await knowledgeItemsService.list('user-123', { includeSuperseded: true });

      expect(result.items).toHaveLength(2);
      expect(result.items.some(i => i.supersededById !== null)).toBe(true);
    });
  });
});
