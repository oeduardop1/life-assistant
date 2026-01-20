import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn(() => 'gte-result'),
  lte: vi.fn(() => 'lte-result'),
  desc: vi.fn(() => 'desc-result'),
  count: vi.fn(() => 'count-result'),
  sql: vi.fn(() => ({ mapWith: vi.fn(() => 'sql-result') })),
}));

import { TrackingEntryRepository } from '../../../../src/modules/tracking/infrastructure/repositories/tracking-entry.repository.js';
import type { TrackingType, LifeArea } from '@life-assistant/database';

/**
 * Create a mock tracking entry for testing
 */
function createMockTrackingEntry(
  overrides: Partial<{
    id: string;
    userId: string;
    type: TrackingType;
    area: LifeArea;
    value: string;
    unit: string | null;
    metadata: Record<string, unknown>;
    entryDate: string;
    entryTime: Date | null;
    source: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
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

describe('TrackingEntryRepository', () => {
  let repository: TrackingEntryRepository;
  let mockDatabaseService: {
    schema: { trackingEntries: object };
    withUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database service
    mockDatabaseService = {
      schema: { trackingEntries: {} },
      withUserId: vi.fn(),
    };

    // Create repository instance with mocks
    repository = new TrackingEntryRepository(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof TrackingEntryRepository
      >[0]
    );
  });

  describe('create', () => {
    it('should_insert_entry_with_all_fields', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEntry]),
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
        type: 'weight' as TrackingType,
        area: 'health' as LifeArea,
        value: '75.5',
        unit: 'kg',
        entryDate: '2024-01-15',
        source: 'form',
        metadata: {},
      });

      expect(result).toEqual(mockEntry);
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
        repository.create('user-123', {
          type: 'weight' as TrackingType,
          area: 'health' as LifeArea,
          value: '75.5',
          entryDate: '2024-01-15',
          source: 'form',
          metadata: {},
        })
      ).rejects.toThrow('Failed to create tracking entry');
    });
  });

  describe('findByUserId', () => {
    it('should_find_entries_by_user_and_type', async () => {
      const mockEntries = [
        createMockTrackingEntry({ id: 'entry-1' }),
        createMockTrackingEntry({ id: 'entry-2' }),
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEntries),
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

      const result = await repository.findByUserId('user-123', { type: 'weight' });

      expect(result).toEqual(mockEntries);
      expect(result).toHaveLength(2);
    });

    it('should_find_entries_within_date_range', async () => {
      const mockEntries = [createMockTrackingEntry()];

      const mockOffset = vi.fn().mockResolvedValue(mockEntries);
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

      const result = await repository.findByUserId('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result).toEqual(mockEntries);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should_apply_pagination_defaults', async () => {
      const mockEntries = [createMockTrackingEntry()];

      const mockOffset = vi.fn().mockResolvedValue(mockEntries);
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

      await repository.findByUserId('user-123', {});

      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(mockOffset).toHaveBeenCalledWith(0);
    });

    it('should_apply_custom_pagination', async () => {
      const mockEntries = [createMockTrackingEntry()];

      const mockOffset = vi.fn().mockResolvedValue(mockEntries);
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

      await repository.findByUserId('user-123', { limit: 10, offset: 20 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockOffset).toHaveBeenCalledWith(20);
    });

    it('should_filter_by_area', async () => {
      const mockEntries = [createMockTrackingEntry()];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEntries),
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

      const result = await repository.findByUserId('user-123', { area: 'health' });

      expect(result).toEqual(mockEntries);
    });

    it('should_filter_by_source', async () => {
      const mockEntries = [createMockTrackingEntry({ source: 'chat' })];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEntries),
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

      const result = await repository.findByUserId('user-123', { source: 'chat' });

      expect(result).toEqual(mockEntries);
    });
  });

  describe('findById', () => {
    it('should_return_entry_when_found', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockEntry]),
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

      const result = await repository.findById('user-123', 'entry-123');

      expect(result).toEqual(mockEntry);
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

  describe('update', () => {
    it('should_update_entry_successfully', async () => {
      const mockEntry = createMockTrackingEntry({ value: '76' });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockEntry]),
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

      const result = await repository.update('user-123', 'entry-123', {
        value: '76',
      });

      expect(result).toEqual(mockEntry);
    });

    it('should_return_null_when_entry_not_found', async () => {
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
        value: '76',
      });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should_delete_entry_by_id', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEntry]),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            delete: mockDelete,
          });
        }
      );

      const result = await repository.delete('user-123', 'entry-123');

      expect(result).toBe(true);
    });

    it('should_return_false_when_entry_not_found', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            delete: mockDelete,
          });
        }
      );

      const result = await repository.delete('user-123', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getAggregationByType', () => {
    it('should_aggregate_by_date_for_type', async () => {
      // Mock stats query
      const mockStats = {
        average: 75.5,
        sum: 226.5,
        min: 74.0,
        max: 77.0,
        count: 3,
      };

      // Mock latest entry
      const mockLatest = { value: '75.5' };
      // Mock previous entry
      const mockPrevious = { value: '75.0' };

      // Create fluent API mocks
      const mockSelectStats = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockStats]),
        }),
      });

      const mockSelectLatest = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockLatest]),
            }),
          }),
        }),
      });

      const mockSelectPrevious = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([mockPrevious]),
              }),
            }),
          }),
        }),
      });

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSelectStats();
        } else if (callCount === 2) {
          return mockSelectLatest();
        }
        return mockSelectPrevious();
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.getAggregationByType(
        'user-123',
        'weight',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.type).toBe('weight');
      expect(result.average).toBe(75.5);
      expect(result.count).toBe(3);
      expect(result.latestValue).toBe(75.5);
      expect(result.previousValue).toBe(75.0);
      expect(result.variation).toBeCloseTo(0.67, 1); // ((75.5 - 75.0) / 75.0) * 100
    });

    it('should_calculate_stats_for_type', async () => {
      const mockStats = {
        average: 8.5,
        sum: 25.5,
        min: 7.0,
        max: 10.0,
        count: 3,
      };

      const mockLatest = { value: '9' };
      const mockPrevious = null;

      const mockSelectStats = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockStats]),
        }),
      });

      const mockSelectLatest = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockLatest]),
            }),
          }),
        }),
      });

      const mockSelectPrevious = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([mockPrevious]),
              }),
            }),
          }),
        }),
      });

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSelectStats();
        } else if (callCount === 2) {
          return mockSelectLatest();
        }
        return mockSelectPrevious();
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (_userId: string, callback: (db: unknown) => Promise<unknown>) => {
          return callback({
            select: mockSelect,
          });
        }
      );

      const result = await repository.getAggregationByType(
        'user-123',
        'mood',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.average).toBe(8.5);
      expect(result.min).toBe(7.0);
      expect(result.max).toBe(10.0);
      expect(result.sum).toBe(25.5);
      expect(result.variation).toBeNull(); // No previous value
    });
  });

  describe('getLatestByType', () => {
    it('should_return_map_of_latest_entries', async () => {
      const weightEntry = createMockTrackingEntry({
        id: 'weight-entry',
        type: 'weight' as TrackingType,
      });
      const waterEntry = createMockTrackingEntry({
        id: 'water-entry',
        type: 'water' as TrackingType,
        value: '2000',
        unit: 'ml',
      });

      let typeIndex = 0;
      const entries = [weightEntry, waterEntry];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                const entry = entries[typeIndex];
                typeIndex++;
                return Promise.resolve(entry ? [entry] : []);
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

      const result = await repository.getLatestByType('user-123', [
        'weight' as TrackingType,
        'water' as TrackingType,
      ]);

      expect(result.get('weight' as TrackingType)).toEqual(weightEntry);
      expect(result.get('water' as TrackingType)).toEqual(waterEntry);
    });

    it('should_return_empty_map_when_no_types', async () => {
      const result = await repository.getLatestByType('user-123', []);

      expect(result.size).toBe(0);
      expect(mockDatabaseService.withUserId).not.toHaveBeenCalled();
    });
  });

  describe('countByType', () => {
    it('should_return_count_by_type', async () => {
      const mockResults = [
        { type: 'weight', count: 10 },
        { type: 'water', count: 25 },
        { type: 'sleep', count: 7 },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockResults),
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

      const result = await repository.countByType('user-123');

      expect(result).toEqual({
        weight: 10,
        water: 25,
        sleep: 7,
      });
    });

    it('should_return_empty_record_when_no_entries', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
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

      const result = await repository.countByType('user-123');

      expect(result).toEqual({});
    });
  });
});
