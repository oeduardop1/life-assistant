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
  recordMetricParamsSchema,
  getTrackingHistoryParamsSchema,
} from '@life-assistant/ai';
import { TrackingService } from './tracking.service';

/**
 * Tracking Tool Executor - Executes record_metric and get_tracking_history tools
 *
 * @see docs/specs/ai.md §6.2 for tool definitions
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Injectable()
export class TrackingToolExecutorService implements ToolExecutor {
  private readonly logger = new Logger(TrackingToolExecutorService.name);

  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Execute a tool call
   */
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const { userId } = context;

    this.logger.log(`Executing tool ${toolCall.name} for user ${userId}`);

    try {
      switch (toolCall.name) {
        case 'record_metric':
          return await this.executeRecordMetric(toolCall, userId);

        case 'get_tracking_history':
          return await this.executeGetTrackingHistory(toolCall, userId);

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
   * Execute record_metric tool
   *
   * Note: This tool has requiresConfirmation: true, meaning the tool loop
   * should pause and ask for user confirmation before executing this.
   */
  private async executeRecordMetric(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const parseResult = recordMetricParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { type, value, unit, date, category, notes } = parseResult.data;

    this.logger.debug(
      `record_metric params: type=${type}, value=${String(value)}, unit=${unit ?? '(default)'}, date=${date}`
    );

    // Map tracking type to life area
    const areaMap: Record<string, string> = {
      weight: 'health',
      water: 'health',
      sleep: 'health',
      exercise: 'health',
      mood: 'mental_health',
      energy: 'health',
      expense: 'financial',
      income: 'financial',
      investment: 'financial',
      custom: 'personal_growth',
    };

    const area = areaMap[type] ?? 'personal_growth';

    // Build metadata
    const metadata: Record<string, unknown> = {};
    if (category) metadata.category = category;
    if (notes) metadata.notes = notes;

    const entry = await this.trackingService.recordMetric(userId, {
      type,
      area,
      value,
      unit,
      entryDate: date,
      source: 'chat',
      metadata,
    });

    this.logger.log(`record_metric saved entry ${entry.id}: ${type} = ${String(value)}`);

    // Format response for Portuguese speaker
    const typeLabels: Record<string, string> = {
      weight: 'peso',
      water: 'água',
      sleep: 'sono',
      exercise: 'exercício',
      mood: 'humor',
      energy: 'energia',
      expense: 'gasto',
      income: 'receita',
      investment: 'investimento',
      custom: 'métrica personalizada',
    };

    const unitLabels: Record<string, string> = {
      kg: 'kg',
      ml: 'ml',
      hours: 'horas',
      min: 'minutos',
      score: 'pontos',
    };

    const typeLabel = typeLabels[type] ?? type;
    const unitLabel = unitLabels[unit ?? ''] ?? unit ?? '';

    return createSuccessResult(toolCall, {
      success: true,
      entryId: entry.id,
      message: `Registrado: ${typeLabel} = ${String(value)} ${unitLabel} em ${date}`,
    });
  }

  /**
   * Execute get_tracking_history tool
   */
  private async executeGetTrackingHistory(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const parseResult = getTrackingHistoryParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { type, days } = parseResult.data;

    this.logger.debug(`get_tracking_history params: type=${type}, days=${String(days)}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get history
    const result = await this.trackingService.getHistory(userId, {
      type: type as string,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 100,
    });

    // Get aggregations
    const aggregation = await this.trackingService.getAggregations(
      userId,
      type as string,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    this.logger.debug(`get_tracking_history found ${String(result.entries.length)} entries`);

    // Format results for LLM
    const formattedEntries = result.entries.map((entry) => ({
      date: entry.entryDate,
      value: parseFloat(entry.value),
      unit: entry.unit,
    }));

    // Trend direction
    let trend = 'stable';
    if (aggregation.variation !== null) {
      if (aggregation.variation > 5) trend = 'increasing';
      else if (aggregation.variation < -5) trend = 'decreasing';
    }

    return createSuccessResult(toolCall, {
      type,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days,
      },
      entries: formattedEntries,
      stats: {
        count: aggregation.count,
        average: aggregation.average,
        min: aggregation.min,
        max: aggregation.max,
        sum: aggregation.sum,
        latestValue: aggregation.latestValue,
        previousValue: aggregation.previousValue,
        variation: aggregation.variation,
        trend,
      },
    });
  }
}
