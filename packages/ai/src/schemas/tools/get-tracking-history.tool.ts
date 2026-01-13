/**
 * get_tracking_history tool definition.
 * Gets historical data for user metrics (weight, expenses, mood, etc.).
 * @module schemas/tools/get-tracking-history.tool
 */

import { z } from 'zod';
import { TrackingType } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the get_tracking_history tool.
 */
export const getTrackingHistoryParamsSchema = z.object({
  type: z.nativeEnum(TrackingType).describe('Type of metric to get history for'),
  days: z.number().min(1).max(90).default(30).describe('Number of days of history to retrieve'),
});

export type GetTrackingHistoryParams = z.infer<typeof getTrackingHistoryParamsSchema>;

/**
 * get_tracking_history tool definition.
 *
 * Used to get historical data for user metrics.
 * This is a READ tool - does not require user confirmation.
 */
export const getTrackingHistoryTool: ToolDefinition<typeof getTrackingHistoryParamsSchema> = {
  name: 'get_tracking_history',
  description:
    'Get historical data for user metrics (weight, expenses, mood, water, sleep, etc.). Returns data points over the specified time period.',
  parameters: getTrackingHistoryParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { type: TrackingType.WEIGHT, days: 30 },
    { type: TrackingType.EXPENSE, days: 7 },
    { type: TrackingType.MOOD, days: 14 },
  ],
};
