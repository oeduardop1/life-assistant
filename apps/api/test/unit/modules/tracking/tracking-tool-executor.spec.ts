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
  recordMetricParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  getTrackingHistoryParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data: { days: 30, ...data } })),
  },
}));

import { TrackingToolExecutorService } from '../../../../src/modules/tracking/application/services/tracking-tool-executor.service.js';
import {
  createSuccessResult,
  createErrorResult,
  recordMetricParamsSchema,
  getTrackingHistoryParamsSchema,
} from '@life-assistant/ai';
import type { ToolCall } from '@life-assistant/ai';
import type { TrackingEntry, TrackingType, LifeArea } from '@life-assistant/database';

/**
 * Create a mock tool call
 */
function createMockToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 'tool-call-123',
    name: 'record_metric',
    arguments: {},
    ...overrides,
  };
}

/**
 * Create a mock tracking entry
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
    source: 'chat',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('TrackingToolExecutorService', () => {
  let trackingToolExecutor: TrackingToolExecutorService;
  let mockTrackingService: {
    recordMetric: ReturnType<typeof vi.fn>;
    getHistory: ReturnType<typeof vi.fn>;
    getAggregations: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTrackingService = {
      recordMetric: vi.fn(),
      getHistory: vi.fn(),
      getAggregations: vi.fn(),
    };

    trackingToolExecutor = new TrackingToolExecutorService(
      mockTrackingService as unknown as ConstructorParameters<
        typeof TrackingToolExecutorService
      >[0]
    );
  });

  describe('execute', () => {
    describe('record_metric', () => {
      it('should_map_type_to_correct_area', async () => {
        const mockEntry = createMockTrackingEntry();
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        // Test weight -> health
        let toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'weight', value: 75, date: '2024-01-15' },
        });
        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });
        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ area: 'health' })
        );

        // Test mood -> mental_health
        vi.clearAllMocks();
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);
        toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'mood', value: 7, date: '2024-01-15' },
        });
        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });
        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ area: 'mental_health' })
        );

        // Test expense -> financial
        vi.clearAllMocks();
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);
        toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'expense', value: 100, date: '2024-01-15' },
        });
        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });
        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ area: 'financial' })
        );
      });

      it('should_use_portuguese_labels_in_response', async () => {
        const mockEntry = createMockTrackingEntry({ value: '75' });
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'weight', value: 75, unit: 'kg', date: '2024-01-15' },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            message: expect.stringContaining('peso'), // Portuguese label
          })
        );
      });

      it('should_use_today_when_date_not_provided', async () => {
        const mockEntry = createMockTrackingEntry();
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        // When a date is provided, it should use that date
        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'weight', value: 75, date: '2024-01-15' },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ entryDate: '2024-01-15' })
        );
      });

      it('should_set_source_to_chat', async () => {
        const mockEntry = createMockTrackingEntry({ source: 'chat' });
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'weight', value: 75, date: '2024-01-15' },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ source: 'chat' })
        );
      });

      it('should_include_metadata_when_category_and_notes_provided', async () => {
        const mockEntry = createMockTrackingEntry({
          metadata: { category: 'food', notes: 'Weekly groceries' },
        });
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: {
            type: 'expense',
            value: 150,
            date: '2024-01-15',
            category: 'food',
            notes: 'Weekly groceries',
          },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockTrackingService.recordMetric).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            metadata: { category: 'food', notes: 'Weekly groceries' },
          })
        );
      });

      it('should_return_success_with_entry_id', async () => {
        const mockEntry = createMockTrackingEntry({ id: 'new-entry-id' });
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'weight', value: 75, date: '2024-01-15' },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            success: true,
            entryId: 'new-entry-id',
          })
        );
      });

      it('should_return_error_on_invalid_params', async () => {
        vi.mocked(recordMetricParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid type' },
        } as unknown as ReturnType<typeof recordMetricParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: {},
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });

      it('should_map_unit_labels_to_portuguese', async () => {
        const mockEntry = createMockTrackingEntry({ unit: 'hours', value: '8' });
        mockTrackingService.recordMetric.mockResolvedValue(mockEntry);

        const toolCall = createMockToolCall({
          name: 'record_metric',
          arguments: { type: 'sleep', value: 8, unit: 'hours', date: '2024-01-15' },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            message: expect.stringContaining('horas'), // Portuguese unit
          })
        );
      });
    });

    describe('get_tracking_history', () => {
      it('should_return_formatted_entries', async () => {
        const mockEntries = [
          createMockTrackingEntry({ id: 'entry-1', entryDate: '2024-01-15', value: '75' }),
          createMockTrackingEntry({ id: 'entry-2', entryDate: '2024-01-14', value: '74.5' }),
        ];
        mockTrackingService.getHistory.mockResolvedValue({
          entries: mockEntries,
          total: 2,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: 74.75,
          sum: 149.5,
          min: 74.5,
          max: 75,
          count: 2,
          latestValue: 75,
          previousValue: 74.5,
          variation: 0.67,
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            type: 'weight',
            entries: expect.arrayContaining([
              expect.objectContaining({ date: '2024-01-15', value: 75 }),
              expect.objectContaining({ date: '2024-01-14', value: 74.5 }),
            ]),
          })
        );
      });

      it('should_respect_limit_parameter', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: null,
          sum: null,
          min: null,
          max: null,
          count: 0,
          latestValue: null,
          previousValue: null,
          variation: null,
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 30 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ limit: 100 })
        );
      });

      it('should_calculate_correct_date_range_from_days', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: null,
          sum: null,
          min: null,
          max: null,
          count: 0,
          latestValue: null,
          previousValue: null,
          variation: null,
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockTrackingService.getHistory).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          })
        );
      });

      it('should_include_stats_in_response', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [createMockTrackingEntry()],
          total: 1,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: 75.5,
          sum: 75.5,
          min: 75.5,
          max: 75.5,
          count: 1,
          latestValue: 75.5,
          previousValue: null,
          variation: null,
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            stats: expect.objectContaining({
              count: 1,
              average: 75.5,
              min: 75.5,
              max: 75.5,
              latestValue: 75.5,
            }),
          })
        );
      });

      it('should_calculate_trend_as_increasing_when_variation_above_5_percent', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: 76,
          sum: 152,
          min: 75,
          max: 77,
          count: 2,
          latestValue: 77,
          previousValue: 75,
          variation: 10, // > 5%
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            stats: expect.objectContaining({
              trend: 'increasing',
            }),
          })
        );
      });

      it('should_calculate_trend_as_decreasing_when_variation_below_minus_5_percent', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: 74,
          sum: 148,
          min: 73,
          max: 75,
          count: 2,
          latestValue: 73,
          previousValue: 75,
          variation: -10, // < -5%
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            stats: expect.objectContaining({
              trend: 'decreasing',
            }),
          })
        );
      });

      it('should_calculate_trend_as_stable_when_variation_within_5_percent', async () => {
        mockTrackingService.getHistory.mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        });
        mockTrackingService.getAggregations.mockResolvedValue({
          type: 'weight',
          average: 75,
          sum: 150,
          min: 74.5,
          max: 75.5,
          count: 2,
          latestValue: 75.2,
          previousValue: 75,
          variation: 0.27, // within -5% to 5%
        });

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: { type: 'weight', days: 7 },
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            stats: expect.objectContaining({
              trend: 'stable',
            }),
          })
        );
      });

      it('should_return_error_on_invalid_params', async () => {
        vi.mocked(getTrackingHistoryParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid type' },
        } as unknown as ReturnType<typeof getTrackingHistoryParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'get_tracking_history',
          arguments: {},
        });

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

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

        await trackingToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(
          toolCall,
          expect.any(Error)
        );
      });
    });
  });
});
