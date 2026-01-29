import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MemoryController } from '../../../../src/modules/memory/presentation/controllers/memory.controller.js';
import type { UserMemoryService } from '../../../../src/modules/memory/application/services/user-memory.service.js';
import type { KnowledgeItemsService } from '../../../../src/modules/memory/application/services/knowledge-items.service.js';
import type { KnowledgeItem, UserMemory } from '@life-assistant/database';

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
    sourceRef: 'conv-123',
    inferenceEvidence: null,
    tags: ['tag1'],
    validatedByUser: false,
    relatedItems: [],
    supersededById: null,
    supersededAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Create a mock user memory for testing
 */
function createMockUserMemory(
  overrides: Partial<UserMemory> = {}
): UserMemory {
  return {
    id: 'memory-123',
    userId: 'user-123',
    bio: 'Test bio',
    occupation: 'Developer',
    familyContext: 'Single',
    currentGoals: ['Goal 1'],
    currentChallenges: ['Challenge 1'],
    topOfMind: ['Topic 1'],
    values: ['Value 1'],
    communicationStyle: 'direct',
    feedbackPreferences: 'constructive',
    version: 1,
    lastConsolidatedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('MemoryController', () => {
  let controller: MemoryController;
  let mockUserMemoryService: {
    getOrCreate: ReturnType<typeof vi.fn>;
  };
  let mockKnowledgeItemsService: {
    getStats: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    validate: ReturnType<typeof vi.fn>;
    exportAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserMemoryService = {
      getOrCreate: vi.fn(),
    };

    mockKnowledgeItemsService = {
      getStats: vi.fn(),
      list: vi.fn(),
      add: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      validate: vi.fn(),
      exportAll: vi.fn(),
    };

    controller = new MemoryController(
      mockUserMemoryService as unknown as UserMemoryService,
      mockKnowledgeItemsService as unknown as KnowledgeItemsService
    );
  });

  describe('getMemoryOverview (GET /memory)', () => {
    it('should_return_memory_overview_with_stats', async () => {
      const mockMemory = createMockUserMemory();
      const mockStats = {
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
        total: 25,
      };

      mockUserMemoryService.getOrCreate.mockResolvedValue(mockMemory);
      mockKnowledgeItemsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getMemoryOverview('user-123');

      expect(result.userMemory.id).toBe('memory-123');
      expect(result.stats.total).toBe(25);
      expect(mockUserMemoryService.getOrCreate).toHaveBeenCalledWith('user-123');
      expect(mockKnowledgeItemsService.getStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('listKnowledgeItems (GET /memory/items)', () => {
    it('should_return_paginated_list', async () => {
      const mockItems = [createMockKnowledgeItem()];
      mockKnowledgeItemsService.list.mockResolvedValue({
        items: mockItems,
        total: 1,
        hasMore: false,
      });

      const result = await controller.listKnowledgeItems('user-123', {});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should_pass_filters_to_service', async () => {
      mockKnowledgeItemsService.list.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      await controller.listKnowledgeItems('user-123', {
        type: 'fact',
        area: 'health',
        source: 'conversation',
        confidenceMin: 0.8,
        confidenceMax: 1.0,
        search: 'test query',
        limit: 10,
        offset: 0,
      });

      expect(mockKnowledgeItemsService.list).toHaveBeenCalledWith('user-123', {
        type: 'fact',
        area: 'health',
        source: 'conversation',
        confidenceMin: 0.8,
        confidenceMax: 1.0,
        search: 'test query',
        limit: 10,
        offset: 0,
      });
    });

    it('should_convert_date_strings_to_dates', async () => {
      mockKnowledgeItemsService.list.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      await controller.listKnowledgeItems('user-123', {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(mockKnowledgeItemsService.list).toHaveBeenCalledWith('user-123', {
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      });
    });
  });

  describe('createKnowledgeItem (POST /memory/items)', () => {
    it('should_create_item_with_user_input_source', async () => {
      const mockItem = createMockKnowledgeItem({ source: 'user_input' });
      mockKnowledgeItemsService.add.mockResolvedValue({ item: mockItem });

      const result = await controller.createKnowledgeItem('user-123', {
        type: 'fact',
        content: 'Test content',
        area: 'health',
        title: 'Test title',
        tags: ['tag1'],
      });

      expect(result.id).toBe('item-123');
      expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith('user-123', {
        type: 'fact',
        content: 'Test content',
        area: 'health',
        title: 'Test title',
        tags: ['tag1'],
        source: 'user_input',
        confidence: 1.0,
      });
    });

    it('should_create_item_without_optional_fields', async () => {
      const mockItem = createMockKnowledgeItem();
      mockKnowledgeItemsService.add.mockResolvedValue({ item: mockItem });

      await controller.createKnowledgeItem('user-123', {
        type: 'fact',
        content: 'Test content',
      });

      expect(mockKnowledgeItemsService.add).toHaveBeenCalledWith('user-123', {
        type: 'fact',
        content: 'Test content',
        source: 'user_input',
        confidence: 1.0,
      });
    });
  });

  describe('getKnowledgeItem (GET /memory/items/:id)', () => {
    it('should_return_item_when_found', async () => {
      const mockItem = createMockKnowledgeItem();
      mockKnowledgeItemsService.findById.mockResolvedValue(mockItem);

      const result = await controller.getKnowledgeItem('user-123', 'item-123');

      expect(result.id).toBe('item-123');
      expect(mockKnowledgeItemsService.findById).toHaveBeenCalledWith('user-123', 'item-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockKnowledgeItemsService.findById.mockResolvedValue(null);

      await expect(
        controller.getKnowledgeItem('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateKnowledgeItem (PATCH /memory/items/:id)', () => {
    it('should_update_item_successfully', async () => {
      const mockItem = createMockKnowledgeItem({ title: 'Updated title' });
      mockKnowledgeItemsService.update.mockResolvedValue(mockItem);

      const result = await controller.updateKnowledgeItem('user-123', 'item-123', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
      expect(mockKnowledgeItemsService.update).toHaveBeenCalledWith('user-123', 'item-123', {
        title: 'Updated title',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockKnowledgeItemsService.update.mockResolvedValue(null);

      await expect(
        controller.updateKnowledgeItem('user-123', 'nonexistent', { title: 'New' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteKnowledgeItem (DELETE /memory/items/:id)', () => {
    it('should_delete_item_successfully', async () => {
      mockKnowledgeItemsService.delete.mockResolvedValue(true);

      await controller.deleteKnowledgeItem('user-123', 'item-123');

      expect(mockKnowledgeItemsService.delete).toHaveBeenCalledWith('user-123', 'item-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockKnowledgeItemsService.delete.mockResolvedValue(false);

      await expect(
        controller.deleteKnowledgeItem('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateKnowledgeItem (POST /memory/items/:id/validate)', () => {
    it('should_validate_item_successfully', async () => {
      const mockItem = createMockKnowledgeItem({
        validatedByUser: true,
        confidence: 1.0,
      });
      mockKnowledgeItemsService.validate.mockResolvedValue(mockItem);

      const result = await controller.validateKnowledgeItem('user-123', 'item-123');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.validatedByUser).toBe(true);
      expect(mockKnowledgeItemsService.validate).toHaveBeenCalledWith('user-123', 'item-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockKnowledgeItemsService.validate.mockResolvedValue(null);

      await expect(
        controller.validateKnowledgeItem('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportMemory (GET /memory/export)', () => {
    it('should_export_all_items', async () => {
      const mockItems = [
        createMockKnowledgeItem({ id: 'item-1' }),
        createMockKnowledgeItem({ id: 'item-2' }),
      ];
      mockKnowledgeItemsService.exportAll.mockResolvedValue({
        items: mockItems,
        total: 2,
        exportedAt: '2024-01-15T12:00:00.000Z',
        stats: { active: 2, superseded: 0 },
      });

      const result = await controller.exportMemory('user-123');

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.exportedAt).toBeDefined();
      expect(result.stats.active).toBe(2);
      expect(result.stats.superseded).toBe(0);
      expect(mockKnowledgeItemsService.exportAll).toHaveBeenCalledWith('user-123');
    });

    it('should_return_empty_array_when_no_items', async () => {
      mockKnowledgeItemsService.exportAll.mockResolvedValue({
        items: [],
        total: 0,
        exportedAt: '2024-01-15T12:00:00.000Z',
        stats: { active: 0, superseded: 0 },
      });

      const result = await controller.exportMemory('user-123');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.stats.active).toBe(0);
    });
  });
});
