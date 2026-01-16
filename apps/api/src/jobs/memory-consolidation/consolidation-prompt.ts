/**
 * Memory consolidation prompt builder
 *
 * @see docs/specs/ai.md §6.5.2 for prompt specification
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */

import { z } from 'zod';
import type { Message } from '@life-assistant/database';

/**
 * Schema for parsed consolidation response
 */
export const consolidationResponseSchema = z.object({
  memory_updates: z.object({
    bio: z.string().optional(),
    occupation: z.string().optional(),
    familyContext: z.string().optional(),
    currentGoals: z.array(z.string()).optional(),
    currentChallenges: z.array(z.string()).optional(),
    topOfMind: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
    learnedPatterns: z.array(z.object({
      pattern: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
    })).optional(),
  }),
  new_knowledge_items: z.array(z.object({
    type: z.enum(['fact', 'preference', 'memory', 'insight', 'person']),
    area: z.enum([
      'health', 'financial', 'relationships', 'career',
      'personal_growth', 'leisure', 'spirituality', 'mental_health',
    ]).optional(),
    content: z.string(),
    title: z.string().optional(),
    confidence: z.number().min(0).max(1),
    source: z.literal('ai_inference'),
    inferenceEvidence: z.string().optional(),
  })),
  updated_knowledge_items: z.array(z.object({
    id: z.string().uuid(),
    content: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })),
});

export type ConsolidationResponse = z.infer<typeof consolidationResponseSchema>;

/**
 * Format messages for the consolidation prompt
 */
function formatMessages(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === 'user' ? 'Usuário' : 'Assistente';
      const timestamp = m.createdAt.toLocaleString('pt-BR');
      return `[${timestamp}] ${role}: ${m.content}`;
    })
    .join('\n\n');
}

/**
 * Format current memory for the prompt
 */
function formatCurrentMemory(memory: {
  bio?: string | null;
  occupation?: string | null;
  familyContext?: string | null;
  currentGoals?: string[] | null;
  currentChallenges?: string[] | null;
  topOfMind?: string[] | null;
  values?: string[] | null;
}): string {
  const parts: string[] = [];

  if (memory.bio) parts.push(`Bio: ${memory.bio}`);
  if (memory.occupation) parts.push(`Ocupação: ${memory.occupation}`);
  if (memory.familyContext) parts.push(`Família: ${memory.familyContext}`);

  if (memory.values && memory.values.length > 0) {
    parts.push(`Valores: ${memory.values.join(', ')}`);
  }
  if (memory.currentGoals && memory.currentGoals.length > 0) {
    parts.push(`Objetivos: ${memory.currentGoals.join(', ')}`);
  }
  if (memory.currentChallenges && memory.currentChallenges.length > 0) {
    parts.push(`Desafios: ${memory.currentChallenges.join(', ')}`);
  }
  if (memory.topOfMind && memory.topOfMind.length > 0) {
    parts.push(`Em mente: ${memory.topOfMind.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : '(Memória vazia)';
}

/**
 * Format existing knowledge items for the prompt
 */
function formatKnowledgeItems(items: { id: string; type: string; content: string; title: string }[]): string {
  if (items.length === 0) return '(Nenhum conhecimento registrado)';

  return items
    .map((item) => `[${item.id}] (${item.type}) ${item.title}: ${item.content}`)
    .join('\n');
}

/**
 * Build the consolidation prompt
 *
 * @param messages - Messages from the last consolidation period
 * @param currentMemory - Current user memory state
 * @param existingKnowledge - Existing knowledge items
 * @returns The prompt string
 */
export function buildConsolidationPrompt(
  messages: Message[],
  currentMemory: {
    bio?: string | null;
    occupation?: string | null;
    familyContext?: string | null;
    currentGoals?: string[] | null;
    currentChallenges?: string[] | null;
    topOfMind?: string[] | null;
    values?: string[] | null;
  },
  existingKnowledge: { id: string; type: string; content: string; title: string }[]
): string {
  return `## Tarefa: Consolidar Memória do Usuário

Analise as conversas recentes e extraia informações para atualizar a memória do usuário.

### Conversas das últimas 24h:
${formatMessages(messages)}

### Memória atual do usuário:
${formatCurrentMemory(currentMemory)}

### Knowledge Items existentes:
${formatKnowledgeItems(existingKnowledge)}

### Instruções:
1. Identifique NOVOS fatos, preferências ou insights sobre o usuário
2. Identifique atualizações para fatos existentes
3. Faça inferências quando houver padrões (mínimo 3 ocorrências)
4. Atribua confidence score para cada item
5. O título DEVE ser um resumo fiel do conteúdo - NUNCA faça inferências no título

### Formato de saída (JSON estrito):
{
  "memory_updates": {
    "bio": "atualização se mencionado",
    "occupation": "ocupação se mencionada",
    "familyContext": "contexto familiar se mencionado",
    "currentGoals": ["novos goals se identificados"],
    "currentChallenges": ["novos challenges se identificados"],
    "topOfMind": ["prioridades atuais"],
    "values": ["valores identificados"],
    "learnedPatterns": [
      {
        "pattern": "padrão identificado",
        "confidence": 0.8,
        "evidence": ["evidência 1", "evidência 2"]
      }
    ]
  },
  "new_knowledge_items": [
    {
      "type": "fact|preference|insight|memory|person",
      "area": "health|financial|relationships|career|personal_growth|leisure|spirituality|mental_health",
      "content": "descrição do fato",
      "title": "título curto",
      "confidence": 0.9,
      "source": "ai_inference",
      "inferenceEvidence": "evidência se for inferência"
    }
  ],
  "updated_knowledge_items": [
    {
      "id": "uuid do item existente",
      "content": "conteúdo atualizado",
      "confidence": 0.95
    }
  ]
}

### Regras:
- Confidence >= 0.7 para inferências
- Confidence >= 0.9 para fatos explícitos
- NÃO crie duplicatas de knowledge_items existentes
- Padrões requerem mínimo 3 ocorrências
- CONTRADIÇÕES: Se identificar informação que contradiz um item existente (ex: "é solteiro" vs "está em relacionamento"), crie um novo item com a informação mais recente. O sistema detectará automaticamente a contradição e substituirá o item antigo.

### IMPORTANTE - Consistência entre título e conteúdo:
- O título DEVE refletir EXATAMENTE o que está no conteúdo
- NUNCA faça inferências ou previsões no título
- Use os termos exatos da conversa

Exemplos de ERROS a evitar:
❌ Título: "É solteiro" | Conteúdo: "Está em relacionamento pensando em terminar"
   (ERRADO: "pensando em terminar" ≠ "é solteiro")
❌ Título: "Vai mudar de emprego" | Conteúdo: "Está insatisfeito no trabalho"
   (ERRADO: insatisfação ≠ decisão de mudar)

Exemplos CORRETOS:
✓ Título: "Relacionamento em crise" | Conteúdo: "Está em relacionamento pensando em terminar"
✓ Título: "Insatisfação no trabalho" | Conteúdo: "Está insatisfeito no trabalho atual"

- Retorne APENAS o JSON, sem texto adicional`;
}

/**
 * Recursively remove null values from object (convert to undefined)
 * LLMs often return null instead of omitting optional fields, but Zod's
 * .optional() only accepts undefined, not null.
 *
 * @param obj - Object to clean
 * @returns Object with null values removed
 */
function removeNulls(obj: unknown): unknown {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) {
    return obj
      .map(removeNulls)
      .filter((item) => item !== undefined);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = removeNulls(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return obj;
}

/**
 * Parse the consolidation response from LLM
 *
 * @param response - Raw LLM response string
 * @returns Parsed and validated consolidation response
 * @throws Error if parsing or validation fails
 */
export function parseConsolidationResponse(response: string): ConsolidationResponse {
  // Try to extract JSON from the response
  let jsonString = response.trim();

  // Remove markdown code blocks if present
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith('```')) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(`Failed to parse consolidation response as JSON: ${response.substring(0, 200)}`);
  }

  // Normalize null values to undefined (LLMs often return null instead of omitting)
  // This is critical because Zod's .optional() accepts undefined but not null
  parsed = removeNulls(parsed);

  // Normalize new_knowledge_items: fix common LLM response issues
  // LLMs sometimes return invalid values despite prompt instructions
  const validTypes = new Set(['fact', 'preference', 'memory', 'insight', 'person']);
  const typeMapping: Record<string, string> = {
    challenge: 'insight', // Map 'challenge' to 'insight'
    goal: 'fact',
    observation: 'insight',
    note: 'fact',
  };

  if (
    parsed &&
    typeof parsed === 'object' &&
    'new_knowledge_items' in parsed &&
    Array.isArray((parsed as Record<string, unknown>).new_knowledge_items)
  ) {
    const items = (parsed as Record<string, unknown>).new_knowledge_items as Record<string, unknown>[];
    const normalizedItems: Record<string, unknown>[] = [];

    for (const item of items) {
      // Always set source to 'ai_inference'
      item.source = 'ai_inference';

      // Normalize type: map invalid types to valid ones or skip
      const itemType = item.type as string;
      if (!validTypes.has(itemType)) {
        if (typeMapping[itemType]) {
          item.type = typeMapping[itemType];
        } else {
          // Skip items with completely invalid types
          continue;
        }
      }

      normalizedItems.push(item);
    }

    (parsed as Record<string, unknown>).new_knowledge_items = normalizedItems;
  }

  // Validate with Zod
  const result = consolidationResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Consolidation response validation failed: ${result.error.message}`);
  }

  return result.data;
}
