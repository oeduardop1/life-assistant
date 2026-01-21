/**
 * delete_metric tool definition.
 * Deletes an existing metric entry.
 * @module schemas/tools/delete-metric.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the delete_metric tool.
 */
export const deleteMetricParamsSchema = z.object({
  entryId: z
    .string()
    .describe(
      'UUID REAL do entry a deletar. DEVE ser o ID EXATO retornado por get_tracking_history (formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"). NUNCA invente IDs.'
    ),
  reason: z.string().optional().describe('Reason for deletion'),
});

export type DeleteMetricParams = z.infer<typeof deleteMetricParamsSchema>;

/**
 * delete_metric tool definition.
 *
 * Used to remove an existing metric entry.
 * Confirmation is handled via system interception (ADR-015).
 * When LLM calls this tool, system pauses and asks user to confirm.
 * User response is detected by ChatService.detectUserIntent().
 */
export const deleteMetricTool: ToolDefinition<typeof deleteMetricParamsSchema> = {
  name: 'delete_metric',
  description: `Remove um registro de métrica.

    ⚠️ REGRA CRÍTICA SOBRE entryId:
    - O entryId DEVE ser o UUID EXATO retornado por get_tracking_history
    - NUNCA invente, gere ou fabrique IDs (como "sleep-12345" ou "entry-xxx")
    - IDs reais são UUIDs no formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    - Copie o ID EXATAMENTE como aparece na resposta de get_tracking_history

    ATENÇÃO: Ação destrutiva. Use APENAS quando usuário EXPLICITAMENTE pedir para deletar.

    QUANDO USAR:
    - Usuário diz "apaga", "deleta", "remove" um registro específico
    - Usuário quer cancelar um registro feito por engano

    FLUXO PARA UM REGISTRO:
    1. Chamar get_tracking_history para obter os registros
    2. Mostrar ao usuário qual registro será deletado (data e valor)
    3. Extrair o campo "id" EXATO do entry da resposta
    4. Chamar delete_metric usando esse ID como entryId

    FLUXO PARA MÚLTIPLOS REGISTROS (BATCH):
    Quando o usuário pedir para deletar VÁRIOS registros (ex: "apaga todos", "deleta os 5"):
    1. Chamar get_tracking_history para obter todos os registros
    2. Listar os registros que serão deletados e pedir confirmação UMA vez
    3. Fazer CHAMADAS PARALELAS de delete_metric - uma para CADA entry ID
       IMPORTANTE: Chame delete_metric MÚLTIPLAS VEZES em paralelo!
       Exemplo para 5 registros: 5 chamadas delete_metric simultâneas

    ⚠️ BATCH OBRIGATÓRIO: Para deletar N registros, faça N chamadas paralelas.
    O sistema agrupa todas as confirmações em uma única pergunta ao usuário.

    NUNCA delete sem confirmação explícita do usuário!`,
  parameters: deleteMetricParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    {
      entryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      reason: 'Usuário pediu para remover registro duplicado',
    },
  ],
};
