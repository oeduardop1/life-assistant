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
 *
 * CRITICAL: The response includes a real UUID 'id' for each entry.
 * This ID MUST be used when calling update_metric or delete_metric.
 */
export const getTrackingHistoryTool: ToolDefinition<typeof getTrackingHistoryParamsSchema> = {
  name: 'get_tracking_history',
  description: `Obtém histórico de métricas do usuário (peso, gastos, humor, água, sono, etc.).

    RETORNA para cada entry:
    - id: UUID real do banco de dados (ex: "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    - date: data do registro
    - value: valor numérico
    - unit: unidade de medida

    IMPORTANTE: O campo "id" retornado é o UUID REAL do banco de dados.
    Este ID DEVE ser usado como "entryId" ao chamar update_metric ou delete_metric.
    NUNCA invente IDs - use EXATAMENTE o ID retornado por esta tool.`,
  parameters: getTrackingHistoryParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { type: TrackingType.WEIGHT, days: 30 },
    { type: TrackingType.EXPENSE, days: 7 },
    { type: TrackingType.MOOD, days: 14 },
  ],
};
