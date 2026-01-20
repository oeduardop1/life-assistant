import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TrackingService } from '../../../../src/modules/tracking/application/services/tracking.service.js';
import type {
  TrackingEntry,
  TrackingType,
  LifeArea,
} from '@life-assistant/database';
import type {
  TrackingEntryRepositoryPort,
  TrackingAggregation,
} from '../../../../src/modules/tracking/domain/ports/tracking-entry.repository.port.js';

/**
 * Create a mock tracking entry for testing
 */
function createMockTrackingEntry(
  overrides: Partial<TrackingEntry> = {}
): TrackingEntry {
  return {
    id: 'entry-123',
    userId: 'user-123',
    type: 'weight' as TrackingType,
    area: 'health' as LifeArea,
    value: '75.5',
    unit: 'kg',
    metadata: {},
    entryDate: '2024-01-15',
    entryTime: null,
    source: 'form',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create mock aggregation result
 */
function createMockAggregation(
  overrides: Partial<TrackingAggregation> = {}
): TrackingAggregation {
  return {
    type: 'weight',
    average: 75.0,
    sum: 225.0,
    min: 74.0,
    max: 76.0,
    count: 3,
    latestValue: 75.5,
    previousValue: 74.8,
    variation: 0.94,
    ...overrides,
  };
}

describe('TrackingService', () => {
  let service: TrackingService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getAggregationByType: ReturnType<typeof vi.fn>;
    getLatestByType: ReturnType<typeof vi.fn>;
    countByType: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getAggregationByType: vi.fn(),
      getLatestByType: vi.fn(),
      countByType: vi.fn(),
    };

    service = new TrackingService(
      mockRepository as unknown as TrackingEntryRepositoryPort
    );
  });

  describe('recordMetric', () => {
    describe('weight validation', () => {
      it('should_create_weight_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({ value: '75' });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'weight',
          area: 'health',
          value: '75',
          unit: 'kg',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_weight_below_minimum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'weight',
            area: 'health',
            value: 0.05, // Below 0.1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.recordMetric('user-123', {
            type: 'weight',
            area: 'health',
            value: 0.05,
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for weight must be at least 0.1');
      });

      it('should_reject_weight_above_maximum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'weight',
            area: 'health',
            value: 501, // Above 500 max
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.recordMetric('user-123', {
            type: 'weight',
            area: 'health',
            value: 501,
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for weight must be at most 500');
      });

      it('should_accept_weight_at_boundary_minimum', async () => {
        const mockEntry = createMockTrackingEntry({ value: '0.1' });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 0.1, // Exactly at min
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
      });

      it('should_accept_weight_at_boundary_maximum', async () => {
        const mockEntry = createMockTrackingEntry({ value: '500' });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 500, // Exactly at max
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
      });
    });

    describe('water validation', () => {
      it('should_create_water_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'water' as TrackingType,
          value: '2000',
          unit: 'ml',
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'water',
          area: 'health',
          value: 2000,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'water',
          area: 'health',
          value: '2000',
          unit: 'ml',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_water_below_minimum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'water',
            area: 'health',
            value: 0, // Below 1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for water must be at least 1');
      });

      it('should_reject_water_above_maximum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'water',
            area: 'health',
            value: 10001, // Above 10000 max
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for water must be at most 10000');
      });
    });

    describe('sleep validation', () => {
      it('should_create_sleep_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'sleep' as TrackingType,
          value: '7.5',
          unit: 'hours',
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'sleep',
          area: 'health',
          value: 7.5,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'sleep',
          area: 'health',
          value: '7.5',
          unit: 'hours',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_sleep_below_minimum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'sleep',
            area: 'health',
            value: 0.05, // Below 0.1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for sleep must be at least 0.1');
      });

      it('should_reject_sleep_above_maximum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'sleep',
            area: 'health',
            value: 25, // Above 24 max
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for sleep must be at most 24');
      });
    });

    describe('exercise validation', () => {
      it('should_create_exercise_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'exercise' as TrackingType,
          value: '45',
          unit: 'min',
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'exercise',
          area: 'health',
          value: 45,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'exercise',
          area: 'health',
          value: '45',
          unit: 'min',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_exercise_below_minimum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'exercise',
            area: 'health',
            value: 0, // Below 1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for exercise must be at least 1');
      });

      it('should_reject_exercise_above_maximum', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'exercise',
            area: 'health',
            value: 1441, // Above 1440 max (24h)
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for exercise must be at most 1440');
      });
    });

    describe('mood validation', () => {
      it('should_create_mood_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'mood' as TrackingType,
          value: '7',
          unit: 'score',
          area: 'mental_health' as LifeArea,
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'mood',
          area: 'mental_health',
          value: 7,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'mood',
          area: 'mental_health',
          value: '7',
          unit: 'score',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_mood_below_scale', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'mood',
            area: 'mental_health',
            value: 0, // Below 1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for mood must be at least 1');
      });

      it('should_reject_mood_above_scale', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'mood',
            area: 'mental_health',
            value: 11, // Above 10 max
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for mood must be at most 10');
      });
    });

    describe('energy validation', () => {
      it('should_create_energy_entry_when_valid', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'energy' as TrackingType,
          value: '8',
          unit: 'score',
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'energy',
          area: 'health',
          value: 8,
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
        expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
          type: 'energy',
          area: 'health',
          value: '8',
          unit: 'score',
          entryDate: '2024-01-15',
          entryTime: undefined,
          source: 'form',
          metadata: {},
        });
      });

      it('should_reject_energy_below_scale', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'energy',
            area: 'health',
            value: 0, // Below 1 min
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for energy must be at least 1');
      });

      it('should_reject_energy_above_scale', async () => {
        await expect(
          service.recordMetric('user-123', {
            type: 'energy',
            area: 'health',
            value: 11, // Above 10 max
            entryDate: '2024-01-15',
          })
        ).rejects.toThrow('Value for energy must be at most 10');
      });
    });

    describe('custom type', () => {
      it('should_create_custom_entry_without_validation_limits', async () => {
        const mockEntry = createMockTrackingEntry({
          type: 'custom' as TrackingType,
          value: '9999',
          unit: 'unit',
          area: 'personal_growth' as LifeArea,
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        const result = await service.recordMetric('user-123', {
          type: 'custom',
          area: 'personal_growth',
          value: 9999, // No max limit for custom
          entryDate: '2024-01-15',
        });

        expect(result).toEqual(mockEntry);
      });
    });

    describe('default values', () => {
      it('should_use_default_unit_when_not_provided', async () => {
        const mockEntry = createMockTrackingEntry();
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
          // unit not provided
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ unit: 'kg' })
        );
      });

      it('should_use_custom_unit_when_provided', async () => {
        const mockEntry = createMockTrackingEntry({ unit: 'lbs' });
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 165,
          unit: 'lbs',
          entryDate: '2024-01-15',
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ unit: 'lbs' })
        );
      });

      it('should_use_form_as_default_source', async () => {
        const mockEntry = createMockTrackingEntry();
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
          // source not provided
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ source: 'form' })
        );
      });

      it('should_use_chat_source_when_provided', async () => {
        const mockEntry = createMockTrackingEntry({ source: 'chat' });
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
          source: 'chat',
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ source: 'chat' })
        );
      });
    });

    describe('metadata', () => {
      it('should_include_metadata_when_provided', async () => {
        const mockEntry = createMockTrackingEntry({
          metadata: { quality: 8, notes: 'Great sleep' },
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'sleep',
          area: 'health',
          value: 8,
          entryDate: '2024-01-15',
          metadata: { quality: 8, notes: 'Great sleep' },
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            metadata: { quality: 8, notes: 'Great sleep' },
          })
        );
      });

      it('should_use_empty_object_when_metadata_not_provided', async () => {
        const mockEntry = createMockTrackingEntry();
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ metadata: {} })
        );
      });
    });

    describe('entryTime', () => {
      it('should_include_entry_time_when_provided', async () => {
        const mockEntry = createMockTrackingEntry({
          entryTime: new Date('2024-01-15T08:30:00Z'),
        });
        mockRepository.create.mockResolvedValue(mockEntry);

        await service.recordMetric('user-123', {
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-15',
          entryTime: '2024-01-15T08:30:00Z',
        });

        expect(mockRepository.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            entryTime: expect.any(Date),
          })
        );
      });
    });
  });

  describe('getHistory', () => {
    it('should_return_paginated_entries', async () => {
      const mockEntries = [
        createMockTrackingEntry({ id: 'entry-1' }),
        createMockTrackingEntry({ id: 'entry-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(mockEntries);

      const result = await service.getHistory('user-123', {});

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should_filter_by_type', async () => {
      const mockEntries = [createMockTrackingEntry()];
      mockRepository.findByUserId.mockResolvedValue(mockEntries);

      await service.getHistory('user-123', { type: 'weight' });

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ type: 'weight' })
      );
    });

    it('should_filter_by_area', async () => {
      const mockEntries = [createMockTrackingEntry()];
      mockRepository.findByUserId.mockResolvedValue(mockEntries);

      await service.getHistory('user-123', { area: 'health' });

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ area: 'health' })
      );
    });

    it('should_filter_by_date_range', async () => {
      const mockEntries = [createMockTrackingEntry()];
      mockRepository.findByUserId.mockResolvedValue(mockEntries);

      await service.getHistory('user-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('should_apply_pagination_defaults', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);

      await service.getHistory('user-123', {});

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it('should_apply_custom_pagination', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);

      await service.getHistory('user-123', { limit: 10, offset: 20 });

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });

    it('should_calculate_hasMore_correctly', async () => {
      // Return 10 items for the paginated query, but 15 total
      const paginatedEntries = Array(10)
        .fill(null)
        .map((_, i) => createMockTrackingEntry({ id: `entry-${i}` }));
      const allEntries = Array(15)
        .fill(null)
        .map((_, i) => createMockTrackingEntry({ id: `entry-${i}` }));

      mockRepository.findByUserId
        .mockResolvedValueOnce(paginatedEntries)
        .mockResolvedValueOnce(allEntries);

      const result = await service.getHistory('user-123', { limit: 10 });

      expect(result.entries.length).toBe(10);
      expect(result.total).toBe(15);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getEntry', () => {
    it('should_return_entry_when_exists', async () => {
      const mockEntry = createMockTrackingEntry();
      mockRepository.findById.mockResolvedValue(mockEntry);

      const result = await service.getEntry('user-123', 'entry-123');

      expect(result).toEqual(mockEntry);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'entry-123');
    });

    it('should_return_null_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getEntry('user-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateEntry', () => {
    it('should_update_entry_successfully', async () => {
      const existingEntry = createMockTrackingEntry({ value: '75' });
      const updatedEntry = createMockTrackingEntry({ value: '76' });

      mockRepository.findById.mockResolvedValue(existingEntry);
      mockRepository.update.mockResolvedValue(updatedEntry);

      const result = await service.updateEntry('user-123', 'entry-123', {
        value: 76,
      });

      expect(result).toEqual(updatedEntry);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'entry-123',
        { value: '76' }
      );
    });

    it('should_return_null_when_entry_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.updateEntry('user-123', 'nonexistent', {
        value: 76,
      });

      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_validate_new_value_according_to_type_rules', async () => {
      const existingEntry = createMockTrackingEntry({ type: 'mood' as TrackingType });
      mockRepository.findById.mockResolvedValue(existingEntry);

      await expect(
        service.updateEntry('user-123', 'entry-123', { value: 11 }) // Above 10 max
      ).rejects.toThrow('Value for mood must be at most 10');
    });

    it('should_update_metadata', async () => {
      const existingEntry = createMockTrackingEntry();
      const updatedEntry = createMockTrackingEntry({
        metadata: { notes: 'Updated notes' },
      });

      mockRepository.findById.mockResolvedValue(existingEntry);
      mockRepository.update.mockResolvedValue(updatedEntry);

      await service.updateEntry('user-123', 'entry-123', {
        metadata: { notes: 'Updated notes' },
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-123',
        'entry-123',
        { metadata: { notes: 'Updated notes' } }
      );
    });
  });

  describe('deleteEntry', () => {
    it('should_delete_entry_successfully', async () => {
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deleteEntry('user-123', 'entry-123');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'entry-123');
    });

    it('should_return_false_when_entry_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      const result = await service.deleteEntry('user-123', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getAggregations', () => {
    it('should_return_aggregations_for_type', async () => {
      const mockAggregation = createMockAggregation();
      mockRepository.getAggregationByType.mockResolvedValue(mockAggregation);

      const result = await service.getAggregations('user-123', 'weight');

      expect(result).toEqual(mockAggregation);
    });

    it('should_use_default_7_days_when_no_dates_provided', async () => {
      const mockAggregation = createMockAggregation();
      mockRepository.getAggregationByType.mockResolvedValue(mockAggregation);

      await service.getAggregations('user-123', 'weight');

      expect(mockRepository.getAggregationByType).toHaveBeenCalledWith(
        'user-123',
        'weight',
        expect.any(Date),
        expect.any(Date)
      );

      // Check that dates are roughly 7 days apart
      const [, , startDate, endDate] =
        mockRepository.getAggregationByType.mock.calls[0];
      const diffInDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeCloseTo(7, 0);
    });

    it('should_use_provided_date_range', async () => {
      const mockAggregation = createMockAggregation();
      mockRepository.getAggregationByType.mockResolvedValue(mockAggregation);

      await service.getAggregations(
        'user-123',
        'weight',
        '2024-01-01',
        '2024-01-31'
      );

      expect(mockRepository.getAggregationByType).toHaveBeenCalledWith(
        'user-123',
        'weight',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('getLatestByTypes', () => {
    it('should_return_map_of_latest_entries', async () => {
      const weightEntry = createMockTrackingEntry({ type: 'weight' as TrackingType });
      const waterEntry = createMockTrackingEntry({
        type: 'water' as TrackingType,
        value: '2000',
      });

      const resultMap = new Map<TrackingType, TrackingEntry>([
        ['weight' as TrackingType, weightEntry],
        ['water' as TrackingType, waterEntry],
      ]);
      mockRepository.getLatestByType.mockResolvedValue(resultMap);

      const result = await service.getLatestByTypes('user-123', [
        'weight' as TrackingType,
        'water' as TrackingType,
      ]);

      expect(result.get('weight' as TrackingType)).toEqual(weightEntry);
      expect(result.get('water' as TrackingType)).toEqual(waterEntry);
    });
  });

  describe('getStats', () => {
    it('should_return_stats_with_total', async () => {
      const byType = {
        weight: 10,
        water: 25,
        sleep: 7,
      };
      mockRepository.countByType.mockResolvedValue(byType);

      const result = await service.getStats('user-123');

      expect(result.byType).toEqual(byType);
      expect(result.total).toBe(42); // 10 + 25 + 7
    });

    it('should_return_zero_total_when_no_entries', async () => {
      mockRepository.countByType.mockResolvedValue({});

      const result = await service.getStats('user-123');

      expect(result.byType).toEqual({});
      expect(result.total).toBe(0);
    });
  });
});
