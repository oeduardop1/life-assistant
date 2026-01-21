import { Injectable, Logger } from '@nestjs/common';
import {
  createLLMFromEnv,
  type LLMPort,
} from '@life-assistant/ai';
import type {
  ContradictionDetectorPort,
  ContradictionCheckResult,
  ContradictionContext,
  ExistingItemForCheck,
  BatchContradictionResult,
} from '../../domain/ports/contradiction-detector.port';

/**
 * Prompt template for state change detection.
 *
 * Instructs the LLM to analyze two facts and determine if the new one
 * makes the existing one obsolete for the user's CURRENT state.
 *
 * @see M1.6.1 - Temporal Knowledge Management
 */
const CONTRADICTION_PROMPT = `Você é um detector de mudanças de estado em fatos pessoais.

## Contexto
- Tipo de conhecimento: {{type}}
- Área da vida: {{area}}

## Fato existente (registrado anteriormente)
"{{existingContent}}"

## Fato novo (acabou de ser informado)
"{{newContent}}"

## Instruções
Determine se o FATO NOVO torna o FATO EXISTENTE obsoleto/inválido para o ESTADO ATUAL do usuário.

### SÃO mudanças de estado (fato existente deve ser SUBSTITUÍDO):
- "é solteiro" → "está namorando" (estado civil mudou)
- "tem dívida de X" → "quitou dívida de X" (não tem mais a dívida)
- "está desempregado" → "trabalha como Y" (situação de emprego mudou)
- "mora em SP" → "mora no RJ" (local de moradia mudou)
- "pesa 80kg" → "pesa 75kg" (valor atual é diferente)
- "salário de R$5000" → "salário de R$8000" (valor atualizado)
- "não gosta de café" → "ama café" (preferência mudou)

### NÃO são mudanças de estado (ambos permanecem verdadeiros):
- "mora sozinho" + "trabalha em casa" (informações diferentes sobre temas diferentes)
- "começou curso de Python" + "terminou curso de Python" (ambos fatos verdadeiros - eventos no tempo)
- "gosta de café" + "prefere expresso" (detalhe adicional, não substituição)
- "nasceu em SP" + "mora no RJ" (informações complementares sobre coisas diferentes)

### REGRA DE OURO
Pergunte: "O fato existente ainda descreve o ESTADO ATUAL do usuário?"
- Se NÃO → É mudança de estado (isContradiction: true)
- Se SIM → Ambos coexistem (isContradiction: false)

## Resposta
Responda APENAS em JSON válido, sem texto adicional:
{
  "isContradiction": boolean,
  "confidence": number (0.0 a 1.0),
  "explanation": "breve explicação em português"
}`;

/**
 * Prompt template for batch state change detection.
 *
 * Checks a new fact against multiple existing facts in one LLM call
 * to determine which ones are obsoleted by the new fact.
 *
 * @see M1.6.1 - Temporal Knowledge Management
 */
const BATCH_CONTRADICTION_PROMPT = `Você é um detector de mudanças de estado em fatos pessoais.

## Contexto
- Tipo de conhecimento: {{type}}
- Área da vida: {{area}}

## Fato novo a ser adicionado
"{{newContent}}"

## Fatos existentes para comparar
{{existingItems}}

## Instruções
Para CADA fato existente, determine se o FATO NOVO torna esse fato obsoleto/inválido.

### SÃO mudanças de estado (fato existente deve ser SUBSTITUÍDO):
- "é solteiro" → "está namorando" (estado civil mudou)
- "tem dívida de X" → "quitou dívida de X" (não tem mais a dívida)
- "está desempregado" → "trabalha como Y" (situação mudou)
- "mora em SP" → "mora no RJ" (local mudou)
- "pesa 80kg" → "pesa 75kg" (valor atual diferente)

### NÃO são mudanças de estado (ambos permanecem verdadeiros):
- Informações sobre temas diferentes
- Eventos no tempo (começou → terminou)
- Detalhes adicionais

### REGRA DE OURO
"O fato existente ainda descreve o ESTADO ATUAL do usuário?"
- Se NÃO → isContradiction: true
- Se SIM → isContradiction: false

## Resposta
Responda APENAS em JSON válido (array), sem texto adicional:
[
  {
    "itemId": "id-do-item",
    "isContradiction": boolean,
    "confidence": number (0.0 a 1.0),
    "explanation": "breve explicação"
  }
]`;

/**
 * LLM-based implementation of ContradictionDetectorPort.
 *
 * Uses the LLM to semantically compare knowledge items and detect contradictions.
 * Part of M1.6.1 - Contradiction Detection for Memory System.
 */
@Injectable()
export class ContradictionDetectorAdapter implements ContradictionDetectorPort {
  private readonly logger = new Logger(ContradictionDetectorAdapter.name);
  private readonly llm: LLMPort;

  constructor() {
    this.llm = createLLMFromEnv();
  }

  /**
   * Check if new content contradicts an existing item.
   */
  async checkContradiction(
    newContent: string,
    existingContent: string,
    context: ContradictionContext
  ): Promise<ContradictionCheckResult> {
    const areaLabel = context.area != null ? this.translateArea(context.area) : 'Não especificada';
    const prompt = CONTRADICTION_PROMPT
      .replace('{{type}}', this.translateType(context.type))
      .replace('{{area}}', areaLabel)
      .replace('{{existingContent}}', existingContent)
      .replace('{{newContent}}', newContent);

    try {
      const response = await this.llm.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent analysis
        maxTokens: 1000, // Increased to avoid truncation
      });

      return this.parseContradictionResult(response.content);
    } catch (error) {
      this.logger.error('Error checking contradiction', error);
      // Return safe default (no contradiction) on error
      return {
        isContradiction: false,
        confidence: 0,
        explanation: 'Erro ao analisar contradição',
      };
    }
  }

  /**
   * Check new content against multiple existing items in batch.
   */
  async batchCheckContradictions(
    newContent: string,
    existingItems: ExistingItemForCheck[],
    context: ContradictionContext
  ): Promise<BatchContradictionResult[]> {
    if (existingItems.length === 0) {
      return [];
    }

    // For small batches (1-2 items), use individual checks
    if (existingItems.length <= 2) {
      const results: BatchContradictionResult[] = [];
      for (const item of existingItems) {
        const result = await this.checkContradiction(
          newContent,
          item.title ? `${item.title}: ${item.content}` : item.content,
          context
        );
        results.push({ itemId: item.id, result });
      }
      return results;
    }

    // For larger batches, use a single LLM call
    const itemsList = existingItems
      .map((item, index) => `${String(index + 1)}. ID: "${item.id}" - "${item.title ? `${item.title}: ` : ''}${item.content}"`)
      .join('\n');

    const batchAreaLabel = context.area != null ? this.translateArea(context.area) : 'Não especificada';
    const prompt = BATCH_CONTRADICTION_PROMPT
      .replace('{{type}}', this.translateType(context.type))
      .replace('{{area}}', batchAreaLabel)
      .replace('{{newContent}}', newContent)
      .replace('{{existingItems}}', itemsList);

    try {
      const response = await this.llm.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 1000,
      });

      return this.parseBatchResult(response.content, existingItems);
    } catch (error) {
      this.logger.error('Error in batch contradiction check', error);
      // Return safe defaults on error
      return existingItems.map((item) => ({
        itemId: item.id,
        result: {
          isContradiction: false,
          confidence: 0,
          explanation: 'Erro ao analisar contradição',
        },
      }));
    }
  }

  /**
   * Parse LLM response for single contradiction check.
   *
   * Handles various response formats:
   * - Clean JSON
   * - JSON wrapped in markdown code blocks
   * - Truncated JSON (extracts partial values)
   */
  private parseContradictionResult(content: string): ContradictionCheckResult {
    try {
      // First, try to extract complete JSON
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          isContradiction: unknown;
          confidence: unknown;
          explanation: unknown;
        };

        return {
          isContradiction: Boolean(parsed.isContradiction),
          confidence: typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
          explanation: typeof parsed.explanation === 'string'
            ? parsed.explanation
            : 'Análise não disponível',
        };
      }

      // If JSON is incomplete/truncated, try to extract individual values
      this.logger.debug('Attempting partial extraction from truncated response', { content });

      // Extract isContradiction value
      const contradictionMatch = /"isContradiction"\s*:\s*(true|false)/i.exec(content);
      const isContradiction = contradictionMatch?.[1]?.toLowerCase() === 'true';

      // Extract confidence value
      const confidenceMatch = /"confidence"\s*:\s*([\d.]+)/.exec(content);
      const confidence = confidenceMatch?.[1]
        ? Math.max(0, Math.min(1, parseFloat(confidenceMatch[1])))
        : 0.5;

      // Extract explanation (partial is ok)
      const explanationMatch = /"explanation"\s*:\s*"([^"]*)/i.exec(content);
      const explanation = explanationMatch?.[1] ?? 'Análise parcial';

      if (contradictionMatch) {
        this.logger.log('Extracted partial values from truncated response', {
          isContradiction,
          confidence,
        });
        return { isContradiction, confidence, explanation };
      }

      throw new Error('Could not extract contradiction result from response');
    } catch (error) {
      this.logger.warn('Failed to parse contradiction result', {
        contentPreview: content.substring(0, 200),
        error,
      });
      return {
        isContradiction: false,
        confidence: 0,
        explanation: 'Erro ao processar resposta',
      };
    }
  }

  /**
   * Parse LLM response for batch contradiction check.
   *
   * Handles various response formats including truncated JSON.
   */
  private parseBatchResult(
    content: string,
    existingItems: ExistingItemForCheck[]
  ): BatchContradictionResult[] {
    try {
      // Extract JSON array from response
      const jsonMatch = /\[[\s\S]*\]/.exec(content);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          itemId: unknown;
          isContradiction: unknown;
          confidence: unknown;
          explanation: unknown;
        }[];

        // Map parsed results to existing items
        return existingItems.map((item) => {
          const found = parsed.find((r) => r.itemId === item.id);
          if (found) {
            return {
              itemId: item.id,
              result: {
                isContradiction: Boolean(found.isContradiction),
                confidence: typeof found.confidence === 'number'
                  ? Math.max(0, Math.min(1, found.confidence))
                  : 0.5,
                explanation: typeof found.explanation === 'string'
                  ? found.explanation
                  : 'Análise não disponível',
              },
            };
          }
          // Item not found in response - assume no contradiction
          return {
            itemId: item.id,
            result: {
              isContradiction: false,
              confidence: 0,
              explanation: 'Item não analisado',
            },
          };
        });
      }

      // If JSON array is incomplete, try to extract partial results
      this.logger.debug('Attempting partial extraction from truncated batch response');

      // Look for individual item results in truncated response
      const results: BatchContradictionResult[] = [];
      for (const item of existingItems) {
        // Try to find this item's result in the response
        const itemPattern = new RegExp(
          `"itemId"\\s*:\\s*"${item.id}"[^}]*"isContradiction"\\s*:\\s*(true|false)`,
          'i'
        );
        const match = itemPattern.exec(content);

        if (match?.[1]) {
          const isContradiction = match[1].toLowerCase() === 'true';
          const confidenceMatch = new RegExp(
            `"itemId"\\s*:\\s*"${item.id}"[^}]*"confidence"\\s*:\\s*([\\d.]+)`
          ).exec(content);
          const confidence = confidenceMatch?.[1]
            ? Math.max(0, Math.min(1, parseFloat(confidenceMatch[1])))
            : 0.5;

          results.push({
            itemId: item.id,
            result: {
              isContradiction,
              confidence,
              explanation: 'Análise parcial',
            },
          });
        } else {
          results.push({
            itemId: item.id,
            result: {
              isContradiction: false,
              confidence: 0,
              explanation: 'Item não analisado',
            },
          });
        }
      }

      if (results.some((r) => r.result.isContradiction)) {
        this.logger.log('Extracted partial batch results from truncated response');
      }

      return results;
    } catch (error) {
      this.logger.warn('Failed to parse batch result', {
        contentPreview: content.substring(0, 300),
        error,
      });
      return existingItems.map((item) => ({
        itemId: item.id,
        result: {
          isContradiction: false,
          confidence: 0,
          explanation: 'Erro ao processar resposta',
        },
      }));
    }
  }

  /**
   * Translate knowledge item type to Portuguese.
   */
  private translateType(type: string): string {
    const translations: Record<string, string> = {
      fact: 'Fato',
      preference: 'Preferência',
      memory: 'Memória',
      insight: 'Insight',
      person: 'Pessoa',
    };
    return translations[type] ?? type;
  }

  /**
   * Translate life area to Portuguese.
   * ADR-017: 6 main areas
   */
  private translateArea(area: string): string {
    const translations: Record<string, string> = {
      health: 'Saúde',
      finance: 'Finanças',
      professional: 'Profissional',
      learning: 'Aprendizado',
      spiritual: 'Espiritual',
      relationships: 'Relacionamentos',
    };
    return translations[area] ?? area;
  }
}
