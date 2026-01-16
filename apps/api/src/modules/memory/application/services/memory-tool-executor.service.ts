import { Injectable, Logger } from '@nestjs/common';
import type { ToolCall } from '@life-assistant/ai';
import {
  type ToolExecutor,
  type ToolExecutionResult,
  type ToolExecutionContext,
  createSuccessResult,
  createErrorResult,
} from '@life-assistant/ai';
import {
  searchKnowledgeParamsSchema,
  addKnowledgeParamsSchema,
  analyzeContextParamsSchema,
} from '@life-assistant/ai';
import { KnowledgeItemsService } from './knowledge-items.service';
import { UserMemoryService } from './user-memory.service';

/**
 * Memory Tool Executor - Executes search_knowledge, add_knowledge, and analyze_context tools
 *
 * @see docs/specs/ai.md §5.1 for tool definitions
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 * @see ADR-014 for Real-time Inference architecture
 */
@Injectable()
export class MemoryToolExecutorService implements ToolExecutor {
  private readonly logger = new Logger(MemoryToolExecutorService.name);

  constructor(
    private readonly knowledgeItemsService: KnowledgeItemsService,
    private readonly userMemoryService: UserMemoryService
  ) {}

  /**
   * Execute a tool call
   */
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const { userId, conversationId } = context;

    this.logger.log(`Executing tool ${toolCall.name} for user ${userId}`);

    try {
      switch (toolCall.name) {
        case 'search_knowledge':
          return await this.executeSearchKnowledge(toolCall, userId);

        case 'add_knowledge':
          return await this.executeAddKnowledge(toolCall, userId, conversationId);

        case 'analyze_context':
          return await this.executeAnalyzeContext(toolCall, userId);

        default:
          return createErrorResult(
            toolCall,
            new Error(`Unknown tool: ${toolCall.name}`)
          );
      }
    } catch (error) {
      this.logger.error(
        `Tool execution error: ${error instanceof Error ? error.message : String(error)}`
      );
      return createErrorResult(toolCall, error);
    }
  }

  /**
   * Execute search_knowledge tool
   */
  private async executeSearchKnowledge(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const parseResult = searchKnowledgeParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { query, type, area, limit } = parseResult.data;

    this.logger.debug(`search_knowledge params: query="${query ?? '(all)'}", type=${type ?? '(any)'}, area=${area ?? '(any)'}, limit=${String(limit)}`);

    // Build search params - type and area are optional in Zod schema
    const searchParams: Parameters<typeof this.knowledgeItemsService.search>[1] = {
      limit,
    };
    if (query !== undefined) searchParams.query = query;
    if (type !== undefined) searchParams.type = type;
    if (area !== undefined) searchParams.area = area;

    const results = await this.knowledgeItemsService.search(userId, searchParams);

    this.logger.debug(`search_knowledge found ${String(results.length)} items`);

    // Format results for LLM
    const formattedResults = results.map((item) => ({
      id: item.id,
      type: item.type,
      area: item.area,
      title: item.title,
      content: item.content,
      confidence: item.confidence,
    }));

    return createSuccessResult(toolCall, {
      count: results.length,
      results: formattedResults,
    });
  }

  /**
   * Execute add_knowledge tool
   */
  private async executeAddKnowledge(
    toolCall: ToolCall,
    userId: string,
    conversationId?: string
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const parseResult = addKnowledgeParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { type, content, area, confidence } = parseResult.data;

    this.logger.debug(`add_knowledge params: type=${type}, content="${content}", area=${area ?? '(none)'}, confidence=${String(confidence)}`);

    // Build add params - area is optional, confidence has default, rest are required
    const addParams: Parameters<typeof this.knowledgeItemsService.add>[1] = {
      type,
      content,
      confidence,
      source: 'conversation',
    };
    if (area !== undefined) addParams.area = area;
    if (conversationId) addParams.sourceRef = conversationId;

    const { item, superseded } = await this.knowledgeItemsService.add(userId, addParams);

    this.logger.log(`add_knowledge saved item ${item.id}: "${item.title ?? 'Untitled'}"${superseded ? ` (superseded: ${superseded.supersededItemId})` : ''}`);

    // Build response with optional supersession info
    const response: Record<string, unknown> = {
      success: true,
      itemId: item.id,
      message: `Conhecimento adicionado: ${item.title ?? 'Item'}`,
    };

    // Include supersession info if a contradiction was resolved
    if (superseded) {
      response.superseded = {
        id: superseded.supersededItemId,
        content: superseded.supersededContent,
        reason: superseded.reason,
      };
      response.message = `Conhecimento adicionado: ${item.title ?? 'Item'} (substituiu informação anterior contraditória)`;
    }

    return createSuccessResult(toolCall, response);
  }

  /**
   * Execute analyze_context tool
   * Finds connections, patterns, and potential contradictions
   *
   * @see ADR-014 for Real-time Inference architecture
   */
  private async executeAnalyzeContext(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const parseResult = analyzeContextParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { currentTopic, relatedAreas, lookForContradictions } = parseResult.data;

    this.logger.debug(
      `analyze_context params: topic="${currentTopic}", areas=[${relatedAreas.join(', ')}], contradictions=${String(lookForContradictions)}`
    );

    // 1. Fetch knowledge items from related areas
    const relatedFactsPromises = relatedAreas.map((area) =>
      this.knowledgeItemsService.findByArea(userId, area, 10)
    );
    const relatedFactsArrays = await Promise.all(relatedFactsPromises);
    const allRelatedFacts = relatedFactsArrays.flat();

    // Remove duplicates (same item might appear in multiple areas)
    const uniqueFacts = allRelatedFacts.filter(
      (fact, index, self) => index === self.findIndex((f) => f.id === fact.id)
    );

    // Sort by confidence descending
    uniqueFacts.sort((a, b) => b.confidence - a.confidence);

    // Limit to top 15 most relevant
    const topFacts = uniqueFacts.slice(0, 15);

    this.logger.debug(`analyze_context found ${String(topFacts.length)} related facts`);

    // 2. Fetch learned patterns from user memory
    const userMemory = await this.userMemoryService.getOrCreate(userId);
    const allPatterns = userMemory.learnedPatterns ?? [];

    // Filter patterns with confidence >= 0.7
    const relevantPatterns = allPatterns.filter((p) => p.confidence >= 0.7);

    this.logger.debug(`analyze_context found ${String(relevantPatterns.length)} relevant patterns`);

    // 3. Build potential connections (suggestions for LLM)
    // This is a simple heuristic - the LLM will do the actual reasoning
    const potentialConnections: string[] = [];

    // Check if any patterns might relate to the current topic
    for (const pattern of relevantPatterns) {
      const patternLower = pattern.pattern.toLowerCase();
      const topicLower = currentTopic.toLowerCase();

      // Simple keyword matching for suggestions
      const topicKeywords = topicLower.split(/\s+/).filter((w) => w.length > 3);
      const patternKeywords = patternLower.split(/\s+/).filter((w) => w.length > 3);

      const hasOverlap = topicKeywords.some((tk) =>
        patternKeywords.some((pk) => pk.includes(tk) || tk.includes(pk))
      );

      if (hasOverlap) {
        potentialConnections.push(
          `O padrão "${pattern.pattern}" pode estar relacionado com "${currentTopic}"`
        );
      }
    }

    // 4. Build contradictions list (placeholder for LLM analysis)
    // The actual contradiction detection is done by the LLM using the facts provided
    // We just provide the data structure for it to populate in its response
    const contradictions: {
      existingFact: string;
      currentStatement: string;
      suggestion: string;
    }[] = [];

    // Note: Real contradiction detection would require NLP/semantic analysis
    // For now, we provide all facts and let the LLM identify contradictions

    // Format results for LLM
    const formattedFacts = topFacts.map((fact) => ({
      id: fact.id,
      type: fact.type,
      content: fact.content,
      confidence: fact.confidence,
      area: fact.area,
    }));

    const formattedPatterns = relevantPatterns.map((p) => ({
      pattern: p.pattern,
      confidence: p.confidence,
      evidence: p.evidence,
    }));

    const result = {
      relatedFacts: formattedFacts,
      existingPatterns: formattedPatterns,
      potentialConnections,
      contradictions,
      _hint: lookForContradictions
        ? 'Analise os fatos acima e verifique se há contradições com o que o usuário está dizendo agora.'
        : undefined,
    };

    this.logger.log(
      `analyze_context completed: ${String(formattedFacts.length)} facts, ${String(formattedPatterns.length)} patterns, ${String(potentialConnections.length)} connections`
    );

    return createSuccessResult(toolCall, result);
  }
}
