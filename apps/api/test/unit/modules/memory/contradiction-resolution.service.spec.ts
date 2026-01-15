import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContradictionResolutionService } from '../../../../src/modules/memory/application/services/contradiction-resolution.service.js';
import type { KnowledgeItem } from '@life-assistant/database';
import type {
  KnowledgeItemRepositoryPort,
} from '../../../../src/modules/memory/domain/ports/knowledge-item.repository.port.js';
import type {
  ContradictionDetectorPort,
} from '../../../../src/modules/memory/domain/ports/contradiction-detector.port.js';

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
    area: 'relationships',
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

describe('ContradictionResolutionService', () => {
  let service: ContradictionResolutionService;
  let mockRepository: {
    findActiveBySameScope: ReturnType<typeof vi.fn>;
    supersede: ReturnType<typeof vi.fn>;
  };
  let mockDetector: {
    checkContradiction: ReturnType<typeof vi.fn>;
    batchCheckContradictions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      findActiveBySameScope: vi.fn(),
      supersede: vi.fn(),
    };

    mockDetector = {
      checkContradiction: vi.fn(),
      batchCheckContradictions: vi.fn(),
    };

    service = new ContradictionResolutionService(
      mockRepository as unknown as KnowledgeItemRepositoryPort,
      mockDetector as unknown as ContradictionDetectorPort
    );
  });

  describe('checkBeforeAdd', () => {
    it('should_return_null_when_no_existing_items', async () => {
      mockRepository.findActiveBySameScope.mockResolvedValue([]);

      const result = await service.checkBeforeAdd(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );

      expect(result.shouldSupersede).toBeNull();
      expect(result.explanation).toBeNull();
    });

    it('should_return_null_when_no_contradictions_found', async () => {
      const existingItem = createMockKnowledgeItem({
        id: 'existing-1',
        content: 'User has a pet dog',
      });
      mockRepository.findActiveBySameScope.mockResolvedValue([existingItem]);
      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'existing-1',
          result: {
            isContradiction: false,
            confidence: 0.2,
            explanation: 'Not related topics',
          },
        },
      ]);

      const result = await service.checkBeforeAdd(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );

      expect(result.shouldSupersede).toBeNull();
    });

    it('should_return_item_to_supersede_when_contradiction_found', async () => {
      const existingItem = createMockKnowledgeItem({
        id: 'existing-1',
        content: 'User is single',
      });
      mockRepository.findActiveBySameScope.mockResolvedValue([existingItem]);
      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'existing-1',
          result: {
            isContradiction: true,
            confidence: 0.95,
            explanation: 'Being single contradicts being in a relationship',
          },
        },
      ]);

      const result = await service.checkBeforeAdd(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );

      expect(result.shouldSupersede).toEqual(existingItem);
      expect(result.explanation).toBe('Being single contradicts being in a relationship');
    });

    it('should_ignore_low_confidence_contradictions', async () => {
      const existingItem = createMockKnowledgeItem({
        id: 'existing-1',
        content: 'User prefers being alone',
      });
      mockRepository.findActiveBySameScope.mockResolvedValue([existingItem]);
      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'existing-1',
          result: {
            isContradiction: true,
            confidence: 0.5, // Below 0.7 threshold
            explanation: 'May be related but not clear',
          },
        },
      ]);

      const result = await service.checkBeforeAdd(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );

      expect(result.shouldSupersede).toBeNull();
    });

    it('should_select_highest_confidence_contradiction', async () => {
      const existingItems = [
        createMockKnowledgeItem({ id: 'existing-1', content: 'User is single' }),
        createMockKnowledgeItem({ id: 'existing-2', content: 'User has no partner' }),
      ];
      mockRepository.findActiveBySameScope.mockResolvedValue(existingItems);
      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'existing-1',
          result: {
            isContradiction: true,
            confidence: 0.8,
            explanation: 'Single vs relationship',
          },
        },
        {
          itemId: 'existing-2',
          result: {
            isContradiction: true,
            confidence: 0.95,
            explanation: 'No partner vs relationship',
          },
        },
      ]);

      const result = await service.checkBeforeAdd(
        'user-123',
        'User is in a relationship',
        'fact',
        'relationships'
      );

      expect(result.shouldSupersede?.id).toBe('existing-2');
      expect(result.explanation).toBe('No partner vs relationship');
    });
  });

  describe('resolve', () => {
    it('should_call_repository_supersede', async () => {
      const updatedItem = createMockKnowledgeItem({
        supersededById: 'new-item-id',
        supersededAt: new Date(),
      });
      mockRepository.supersede.mockResolvedValue(updatedItem);

      await service.resolve(
        'user-123',
        'old-item-id',
        'new-item-id',
        'Old item contradicts new info'
      );

      expect(mockRepository.supersede).toHaveBeenCalledWith(
        'user-123',
        'old-item-id',
        'new-item-id'
      );
    });

    it('should_handle_already_superseded_item', async () => {
      mockRepository.supersede.mockResolvedValue(null);

      // Should not throw
      await service.resolve(
        'user-123',
        'old-item-id',
        'new-item-id',
        'Old item contradicts new info'
      );

      expect(mockRepository.supersede).toHaveBeenCalled();
    });
  });

  describe('findContradictionsInGroup', () => {
    it('should_return_empty_array_for_less_than_2_items', async () => {
      const result = await service.findContradictionsInGroup('user-123', []);
      expect(result).toEqual([]);

      const result2 = await service.findContradictionsInGroup('user-123', [
        createMockKnowledgeItem(),
      ]);
      expect(result2).toEqual([]);
    });

    it('should_find_contradictions_in_group', async () => {
      const item1 = createMockKnowledgeItem({
        id: 'item-1',
        content: 'User is single',
        createdAt: new Date('2024-01-01'),
      });
      const item2 = createMockKnowledgeItem({
        id: 'item-2',
        content: 'User is in a relationship',
        createdAt: new Date('2024-01-15'), // More recent
      });

      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'item-2',
          result: {
            isContradiction: true,
            confidence: 0.95,
            explanation: 'Single vs relationship',
          },
        },
      ]);

      const result = await service.findContradictionsInGroup('user-123', [item1, item2]);

      expect(result).toHaveLength(1);
      expect(result[0].keep.id).toBe('item-2'); // More recent
      expect(result[0].supersede.id).toBe('item-1');
      expect(result[0].explanation).toBe('Single vs relationship');
    });

    it('should_keep_user_validated_item_over_non_validated', async () => {
      const item1 = createMockKnowledgeItem({
        id: 'item-1',
        content: 'User is single',
        validatedByUser: true, // User validated
        createdAt: new Date('2024-01-01'),
      });
      const item2 = createMockKnowledgeItem({
        id: 'item-2',
        content: 'User is in a relationship',
        validatedByUser: false,
        createdAt: new Date('2024-01-15'), // More recent but not validated
      });

      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'item-2',
          result: {
            isContradiction: true,
            confidence: 0.95,
            explanation: 'Single vs relationship',
          },
        },
      ]);

      const result = await service.findContradictionsInGroup('user-123', [item1, item2]);

      expect(result).toHaveLength(1);
      expect(result[0].keep.id).toBe('item-1'); // User validated wins
      expect(result[0].supersede.id).toBe('item-2');
    });

    it('should_keep_higher_confidence_item', async () => {
      const item1 = createMockKnowledgeItem({
        id: 'item-1',
        content: 'User is single',
        confidence: 1.0, // Higher confidence
        createdAt: new Date('2024-01-01'),
      });
      const item2 = createMockKnowledgeItem({
        id: 'item-2',
        content: 'User is in a relationship',
        confidence: 0.7,
        createdAt: new Date('2024-01-15'), // More recent but lower confidence
      });

      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'item-2',
          result: {
            isContradiction: true,
            confidence: 0.95,
            explanation: 'Single vs relationship',
          },
        },
      ]);

      const result = await service.findContradictionsInGroup('user-123', [item1, item2]);

      expect(result).toHaveLength(1);
      expect(result[0].keep.id).toBe('item-1'); // Higher confidence wins
      expect(result[0].supersede.id).toBe('item-2');
    });

    it('should_ignore_low_confidence_contradictions', async () => {
      const item1 = createMockKnowledgeItem({ id: 'item-1' });
      const item2 = createMockKnowledgeItem({ id: 'item-2' });

      mockDetector.batchCheckContradictions.mockResolvedValue([
        {
          itemId: 'item-2',
          result: {
            isContradiction: true,
            confidence: 0.5, // Below threshold
            explanation: 'Unclear',
          },
        },
      ]);

      const result = await service.findContradictionsInGroup('user-123', [item1, item2]);

      expect(result).toHaveLength(0);
    });
  });
});
