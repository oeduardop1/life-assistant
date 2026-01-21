/**
 * update_metric tool definition.
 * Updates an existing metric entry (for corrections).
 * @module schemas/tools/update-metric.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the update_metric tool.
 */
export const updateMetricParamsSchema = z.object({
  entryId: z
    .string()
    .describe(
      'UUID REAL do entry a atualizar. DEVE ser o ID EXATO retornado por get_tracking_history (formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"). NUNCA invente IDs.'
    ),
  value: z.number().describe('New value for the metric'),
  unit: z.string().optional().describe('New unit (if changing)'),
  reason: z.string().optional().describe('Reason for the correction'),
});

export type UpdateMetricParams = z.infer<typeof updateMetricParamsSchema>;

/**
 * update_metric tool definition.
 *
 * Used to correct an existing metric entry.
 * Confirmation is handled via system interception (ADR-015).
 * When LLM calls this tool, system pauses and asks user to confirm.
 * User response is detected by ChatService.detectUserIntent().
 */
export const updateMetricTool: ToolDefinition<typeof updateMetricParamsSchema> = {
  name: 'update_metric',
  description: `Corrige um registro de métrica existente.

    ⚠️ REGRA CRÍTICA SOBRE entryId:
    - O entryId DEVE ser o UUID EXATO retornado por get_tracking_history
    - NUNCA invente, gere ou fabrique IDs (como "sleep-12345" ou "entry-xxx")
    - IDs reais são UUIDs no formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    - Copie o ID EXATAMENTE como aparece na resposta de get_tracking_history

    QUANDO USAR:
    - Usuário quer CORRIGIR um valor JÁ REGISTRADO
    - Usuário diz "errei", "não era X, era Y", "corrigi", "o certo é"

    FLUXO OBRIGATÓRIO:
    1. PRIMEIRO: Chamar get_tracking_history para obter os registros
    2. SEGUNDO: Extrair o campo "id" do entry correto da resposta
    3. TERCEIRO: Chamar update_metric usando esse ID EXATO como entryId
    4. Sistema pedirá confirmação ao usuário

    EXEMPLO DE FLUXO CORRETO:
    1. get_tracking_history({ type: "sleep", days: 7 })
    2. Resposta inclui: { entries: [{ id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", value: 5.5, ... }] }
    3. update_metric({ entryId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", value: 4 })

    NUNCA use record_metric para corrigir - isso cria duplicatas!`,
  parameters: updateMetricParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    {
      entryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      value: 61.7,
      reason: 'Usuário corrigiu valor errado',
    },
  ],
};
