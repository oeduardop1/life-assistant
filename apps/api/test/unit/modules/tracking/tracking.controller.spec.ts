import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TrackingController } from '../../../../src/modules/tracking/presentation/controllers/tracking.controller.js';
import type { TrackingService } from '../../../../src/modules/tracking/application/services/tracking.service.js';
import type { TrackingEntry, TrackingType, LifeArea } from '@life-assistant/database';
import type { AuthenticatedUser } from '../../../../src/common/types/request.types.js';

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
 * Create a mock authenticated user
 */
function createMockUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    ...overrides,
  } as AuthenticatedUser;
}

describe('TrackingController', () => {
  let controller: TrackingController;
  let mockTrackingService: {
    recordMetric: ReturnType<typeof vi.fn>;
    getHistory: ReturnType<typeof vi.fn>;
    getEntry: ReturnType<typeof vi.fn>;
    updateEntry: ReturnType<typeof vi.fn>;
    deleteEntry: ReturnType<typeof vi.fn>;
    getAggregations: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTrackingService = {
      recordMetric: vi.fn(),
      getHistory: vi.fn(),
      getEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      getAggregations: vi.fn(),
      getStats: vi.fn(),
    };

    controller = new TrackingController(
      mockTrackingService as unknown as TrackingService
    );
  });

  describe('create (POST /tracking)', () => {
    it('should_create_entry_when_valid_dto', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockUser = createMockUser();
      mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

      const result = await controller.create(mockUser, {
        type: 'weight' as any,
        area: 'health' as any,
        value: 75.5,
        entryDate: '2024-01-15',
      });

      expect(result.entry).toEqual(mockEntry);
      expect(mockTrackingService.recordMetric).toHaveBeenCalledWith('user-123', {
        type: 'weight',
        area: 'health',
        value: 75.5,
        unit: undefined,
        entryDate: '2024-01-15',
        entryTime: undefined,
        source: 'form',
        metadata: undefined,
      });
    });

    it('should_pass_optional_fields_when_provided', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockUser = createMockUser();
      mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

      await controller.create(mockUser, {
        type: 'weight' as any,
        area: 'health' as any,
        value: 75.5,
        unit: 'lbs',
        entryDate: '2024-01-15',
        entryTime: '2024-01-15T08:00:00Z',
        source: 'chat',
        metadata: { notes: 'Morning weight' },
      });

      expect(mockTrackingService.recordMetric).toHaveBeenCalledWith('user-123', {
        type: 'weight',
        area: 'health',
        value: 75.5,
        unit: 'lbs',
        entryDate: '2024-01-15',
        entryTime: '2024-01-15T08:00:00Z',
        source: 'chat',
        metadata: { notes: 'Morning weight' },
      });
    });

    it('should_use_form_as_default_source', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockUser = createMockUser();
      mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

      await controller.create(mockUser, {
        type: 'weight' as any,
        area: 'health' as any,
        value: 75.5,
        entryDate: '2024-01-15',
        source: undefined, // Explicitly undefined
      });

      expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ source: 'form' })
      );
    });
  });

  describe('list (GET /tracking)', () => {
    it('should_return_paginated_entries', async () => {
      const mockEntries = [createMockTrackingEntry()];
      const mockUser = createMockUser();
      mockTrackingService.getHistory.mockResolvedValue({
        entries: mockEntries,
        total: 1,
        hasMore: false,
      });

      const result = await controller.list(mockUser, {});

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should_filter_by_type', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getHistory.mockResolvedValue({
        entries: [],
        total: 0,
        hasMore: false,
      });

      await controller.list(mockUser, { type: 'weight' as any });

      expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ type: 'weight' })
      );
    });

    it('should_filter_by_area', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getHistory.mockResolvedValue({
        entries: [],
        total: 0,
        hasMore: false,
      });

      await controller.list(mockUser, { area: 'health' as any });

      expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ area: 'health' })
      );
    });

    it('should_filter_by_date_range', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getHistory.mockResolvedValue({
        entries: [],
        total: 0,
        hasMore: false,
      });

      await controller.list(mockUser, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
      );
    });

    it('should_apply_pagination', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getHistory.mockResolvedValue({
        entries: [],
        total: 0,
        hasMore: false,
      });

      await controller.list(mockUser, { limit: 10, offset: 20 });

      expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });
  });

  describe('getAggregations (GET /tracking/aggregations)', () => {
    it('should_return_aggregations_for_type', async () => {
      const mockAggregation = {
        type: 'weight',
        average: 75.5,
        sum: 226.5,
        min: 74.0,
        max: 77.0,
        count: 3,
        latestValue: 75.5,
        previousValue: 75.0,
        variation: 0.67,
      };
      const mockUser = createMockUser();
      mockTrackingService.getAggregations.mockResolvedValue(mockAggregation);

      const result = await controller.getAggregations(mockUser, {
        type: 'weight' as any,
      });

      expect(result.aggregation).toEqual(mockAggregation);
      expect(mockTrackingService.getAggregations).toHaveBeenCalledWith(
        'user-123',
        'weight',
        undefined,
        undefined
      );
    });

    it('should_pass_date_range_when_provided', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getAggregations.mockResolvedValue({});

      await controller.getAggregations(mockUser, {
        type: 'weight' as any,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockTrackingService.getAggregations).toHaveBeenCalledWith(
        'user-123',
        'weight',
        '2024-01-01',
        '2024-01-31'
      );
    });
  });

  describe('getStats (GET /tracking/stats)', () => {
    it('should_return_tracking_stats', async () => {
      const mockStats = {
        byType: { weight: 10, water: 25, sleep: 7 },
        total: 42,
      };
      const mockUser = createMockUser();
      mockTrackingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result.stats).toEqual(mockStats);
      expect(mockTrackingService.getStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getById (GET /tracking/:id)', () => {
    it('should_return_entry_when_exists', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockUser = createMockUser();
      mockTrackingService.getEntry.mockResolvedValue(mockEntry);

      const result = await controller.getById(mockUser, 'entry-123');

      expect(result.entry).toEqual(mockEntry);
      expect(mockTrackingService.getEntry).toHaveBeenCalledWith('user-123', 'entry-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      const mockUser = createMockUser();
      mockTrackingService.getEntry.mockResolvedValue(null);

      await expect(controller.getById(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );

      await expect(controller.getById(mockUser, 'nonexistent')).rejects.toThrow(
        'Tracking entry not found'
      );
    });
  });

  describe('update (PATCH /tracking/:id)', () => {
    it('should_update_entry_successfully', async () => {
      const mockEntry = createMockTrackingEntry({ value: '76' });
      const mockUser = createMockUser();
      mockTrackingService.updateEntry.mockResolvedValue(mockEntry);

      const result = await controller.update(mockUser, 'entry-123', {
        value: 76,
      });

      expect(result.entry).toEqual(mockEntry);
      expect(mockTrackingService.updateEntry).toHaveBeenCalledWith(
        'user-123',
        'entry-123',
        {
          value: 76,
          unit: undefined,
          entryDate: undefined,
          entryTime: undefined,
          metadata: undefined,
        }
      );
    });

    it('should_throw_NotFoundException_when_entry_not_found', async () => {
      const mockUser = createMockUser();
      mockTrackingService.updateEntry.mockResolvedValue(null);

      await expect(
        controller.update(mockUser, 'nonexistent', { value: 76 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should_update_all_fields_when_provided', async () => {
      const mockEntry = createMockTrackingEntry();
      const mockUser = createMockUser();
      mockTrackingService.updateEntry.mockResolvedValue(mockEntry);

      await controller.update(mockUser, 'entry-123', {
        value: 76,
        unit: 'lbs',
        entryDate: '2024-01-16',
        entryTime: '2024-01-16T08:00:00Z',
        metadata: { notes: 'Updated' },
      });

      expect(mockTrackingService.updateEntry).toHaveBeenCalledWith(
        'user-123',
        'entry-123',
        {
          value: 76,
          unit: 'lbs',
          entryDate: '2024-01-16',
          entryTime: '2024-01-16T08:00:00Z',
          metadata: { notes: 'Updated' },
        }
      );
    });
  });

  describe('delete (DELETE /tracking/:id)', () => {
    it('should_delete_entry_successfully', async () => {
      const mockUser = createMockUser();
      mockTrackingService.deleteEntry.mockResolvedValue(true);

      await controller.delete(mockUser, 'entry-123');

      expect(mockTrackingService.deleteEntry).toHaveBeenCalledWith(
        'user-123',
        'entry-123'
      );
    });

    it('should_throw_NotFoundException_when_entry_not_found', async () => {
      const mockUser = createMockUser();
      mockTrackingService.deleteEntry.mockResolvedValue(false);

      await expect(controller.delete(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
