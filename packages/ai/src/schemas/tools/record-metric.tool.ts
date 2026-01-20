/**
 * record_metric tool definition.
 * Records a metric for the user (weight, expense, mood, etc.).
 * @module schemas/tools/record-metric.tool
 */

import { z } from 'zod';
import { TrackingType } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the record_metric tool.
 */
export const recordMetricParamsSchema = z.object({
  type: z.nativeEnum(TrackingType).describe('Type of metric: weight, expense, mood, water, sleep, exercise, etc.'),
  value: z.number().describe('Numeric value of the metric'),
  unit: z.string().optional().describe('Unit of measurement (e.g., kg, ml, hours)'),
  date: z.string().describe('ISO date string (YYYY-MM-DD) for the metric'),
  category: z.string().optional().describe('Category for expenses (e.g., food, transport, entertainment)'),
  notes: z.string().optional().describe('Additional notes about the metric'),
});

export type RecordMetricParams = z.infer<typeof recordMetricParamsSchema>;

/**
 * record_metric tool definition.
 *
 * Used to record a metric for the user.
 * Confirmation is handled via system interception (ADR-015).
 * When LLM calls this tool, system pauses and asks user to confirm.
 * User response is detected by ChatService.detectUserIntent().
 */
export const recordMetricTool: ToolDefinition<typeof recordMetricParamsSchema> = {
  name: 'record_metric',
  description:
    'Record a metric for the user. The system will automatically ask the user for confirmation.',
  parameters: recordMetricParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    // Weight - with unit
    { type: TrackingType.WEIGHT, value: 82.5, unit: 'kg', date: '2026-01-12' },
    // Expense - with category
    { type: TrackingType.EXPENSE, value: 150, date: '2026-01-12', category: 'food', notes: 'Weekly groceries' },
    // Mood - without unit or category
    { type: TrackingType.MOOD, value: 7, date: '2026-01-12' },
    // Water - different unit
    { type: TrackingType.WATER, value: 2000, unit: 'ml', date: '2026-01-12' },
  ],
};
