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
  updateMetricParamsSchema,
  deleteMetricParamsSchema,
  recordHabitParamsSchema,
  getHabitsParamsSchema,
} from '@life-assistant/ai';
import { getTodayInTimezone, getDateDaysAgo } from '@life-assistant/shared';
import { TrackingService } from './tracking.service';
import { HabitsService } from './habits.service';
import { SettingsService } from '../../../settings/application/services/settings.service';

/**
 * Tracking Tool Executor - Executes tracking and habits tools
 *
 * @see docs/specs/domains/tracking.md §7 for tool definitions
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Injectable()
export class TrackingToolExecutorService implements ToolExecutor {
  private readonly logger = new Logger(TrackingToolExecutorService.name);

  constructor(
    private readonly trackingService: TrackingService,
    private readonly habitsService: HabitsService,
    private readonly settingsService: SettingsService
  ) {}

  /**
   * Get user's timezone from settings, defaulting to America/Sao_Paulo
   */
  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const settings = await this.settingsService.getUserSettings(userId);
      return settings.timezone;
    } catch {
      return 'America/Sao_Paulo';
    }
  }

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

        case 'update_metric':
          return await this.executeUpdateMetric(toolCall, userId);

        case 'delete_metric':
          return await this.executeDeleteMetric(toolCall, userId);

        // delete_metrics (batch) was removed - LLM hallucinates entry IDs
        // Parallel delete_metric calls work correctly

        case 'record_habit':
          return await this.executeRecordHabit(toolCall, userId);

        case 'get_habits':
          return await this.executeGetHabits(toolCall, userId);

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

    const { type, value, unit, date, notes } = parseResult.data;

    this.logger.debug(
      `record_metric params: type=${type}, value=${String(value)}, unit=${unit ?? '(default)'}, date=${date}`
    );

    // Map tracking type to life area (ADR-017: 6 main areas)
    // Note: Finance types (expense, income, investment) use dedicated Finance module (M2.2)
    const areaMap: Record<string, string> = {
      weight: 'health',
      water: 'health',
      sleep: 'health',
      exercise: 'health',
      mood: 'health', // mental is now a sub-area of health
      energy: 'health',
      custom: 'learning',
    };

    const area = areaMap[type] ?? 'learning';

    // Build metadata
    const metadata: Record<string, unknown> = {};
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

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);

    // Calculate date range using timezone-aware functions
    const endDateStr = getTodayInTimezone(timezone);
    const startDateStr = getDateDaysAgo(days - 1, timezone);

    // Get history
    const result = await this.trackingService.getHistory(userId, {
      type: type as string,
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 100,
    });

    // Get aggregations
    const aggregation = await this.trackingService.getAggregations(
      userId,
      type as string,
      startDateStr,
      endDateStr
    );

    this.logger.debug(`get_tracking_history found ${String(result.entries.length)} entries`);

    // Format results for LLM
    // CRITICAL: The 'id' field is the real UUID that MUST be used for update_metric/delete_metric
    const formattedEntries = result.entries.map((entry) => ({
      id: entry.id, // UUID real - usar este valor EXATO como entryId em update_metric/delete_metric
      date: entry.entryDate,
      value: parseFloat(entry.value),
      unit: entry.unit,
    }));

    // Log the actual IDs being returned so we can verify LLM uses them correctly
    this.logger.debug(
      `get_tracking_history entry IDs: ${formattedEntries.map((e) => `${e.id} (${String(e.value)} ${e.unit ?? ''})`).join(', ')}`
    );

    // Trend direction
    let trend = 'stable';
    if (aggregation.variation !== null) {
      if (aggregation.variation > 5) trend = 'increasing';
      else if (aggregation.variation < -5) trend = 'decreasing';
    }

    return createSuccessResult(toolCall, {
      _note:
        'IMPORTANTE: Para update_metric ou delete_metric, use o campo "id" EXATO de cada entry como entryId. Nunca invente IDs.',
      type,
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
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

  /**
   * Execute update_metric tool
   *
   * Note: This tool has requiresConfirmation: true, meaning the tool loop
   * should pause and ask for user confirmation before executing this.
   */
  private async executeUpdateMetric(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = updateMetricParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { entryId, value, unit, reason } = parseResult.data;

    this.logger.debug(
      `update_metric params: entryId=${entryId}, value=${String(value)}, reason=${reason ?? '(none)'}`
    );

    // Get existing entry to show old value in response
    const existingEntry = await this.trackingService.getEntry(userId, entryId);
    if (!existingEntry) {
      return createErrorResult(
        toolCall,
        new Error(`Registro não encontrado: ${entryId}`)
      );
    }

    const oldValue = existingEntry.value;
    const oldUnit = existingEntry.unit;

    // Update the entry
    const updatedEntry = await this.trackingService.updateEntry(userId, entryId, {
      value,
      unit,
      metadata: reason ? { correctionReason: reason } : undefined,
    });

    if (!updatedEntry) {
      return createErrorResult(
        toolCall,
        new Error(`Falha ao atualizar registro: ${entryId}`)
      );
    }

    this.logger.log(`update_metric updated entry ${entryId}: ${oldValue} → ${String(value)}`);

    // Type labels for response
    const typeLabels: Record<string, string> = {
      weight: 'peso',
      water: 'água',
      sleep: 'sono',
      exercise: 'exercício',
      mood: 'humor',
      energy: 'energia',
    };
    const typeLabel = typeLabels[existingEntry.type] ?? existingEntry.type;

    return createSuccessResult(toolCall, {
      success: true,
      entryId,
      message: `Corrigido: ${typeLabel} de ${oldValue} ${oldUnit ?? ''} para ${String(value)} ${unit ?? oldUnit ?? ''}`.trim(),
      oldValue: parseFloat(oldValue),
      newValue: value,
    });
  }

  /**
   * Execute delete_metric tool
   *
   * Note: This tool has requiresConfirmation: true, meaning the tool loop
   * should pause and ask for user confirmation before executing this.
   */
  private async executeDeleteMetric(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = deleteMetricParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { entryId, reason } = parseResult.data;

    this.logger.debug(`delete_metric params: entryId=${entryId}, reason=${reason ?? '(none)'}`);

    // Get existing entry to show what was deleted
    const existingEntry = await this.trackingService.getEntry(userId, entryId);
    if (!existingEntry) {
      return createErrorResult(
        toolCall,
        new Error(`Registro não encontrado: ${entryId}`)
      );
    }

    const deleted = await this.trackingService.deleteEntry(userId, entryId);

    if (!deleted) {
      return createErrorResult(
        toolCall,
        new Error(`Falha ao deletar registro: ${entryId}`)
      );
    }

    this.logger.log(`delete_metric deleted entry ${entryId}`);

    // Type labels for response
    const typeLabels: Record<string, string> = {
      weight: 'peso',
      water: 'água',
      sleep: 'sono',
      exercise: 'exercício',
      mood: 'humor',
      energy: 'energia',
    };
    const typeLabel = typeLabels[existingEntry.type] ?? existingEntry.type;

    return createSuccessResult(toolCall, {
      success: true,
      entryId,
      message: `Removido: ${typeLabel} de ${existingEntry.value} ${existingEntry.unit ?? ''} (${existingEntry.entryDate})`.trim(),
      deletedValue: parseFloat(existingEntry.value),
    });
  }

  // executeDeleteMetrics was removed - LLM hallucinates entry IDs
  // Parallel delete_metric calls work correctly and are confirmed together

  /**
   * Execute record_habit tool
   *
   * Note: This tool has requiresConfirmation: true, meaning the tool loop
   * should pause and ask for user confirmation before executing this.
   *
   * @see docs/specs/domains/tracking.md §7.2 for spec
   */
  private async executeRecordHabit(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = recordHabitParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { habitName, date, notes } = parseResult.data;

    // Get user timezone for accurate date calculation
    const timezone = await this.getUserTimezone(userId);
    const targetDate = date ?? getTodayInTimezone(timezone);

    this.logger.debug(
      `record_habit params: habitName="${habitName}", date=${targetDate}`
    );

    // Get all habits and find the best match
    const habits = await this.habitsService.findAll(userId);

    if (habits.length === 0) {
      return createErrorResult(
        toolCall,
        new Error('Você ainda não tem hábitos cadastrados. Crie um hábito primeiro no dashboard de Tracking.')
      );
    }

    // Find exact match first (case-insensitive)
    let matchedHabit = habits.find(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );

    // If no exact match, try fuzzy matching (contains)
    matchedHabit ??= habits.find(
      (h) =>
        h.name.toLowerCase().includes(habitName.toLowerCase()) ||
        habitName.toLowerCase().includes(h.name.toLowerCase())
    );

    if (!matchedHabit) {
      const availableHabits = habits.map((h) => h.name).join(', ');
      return createErrorResult(
        toolCall,
        new Error(
          `Hábito "${habitName}" não encontrado. Hábitos disponíveis: ${availableHabits}`
        )
      );
    }

    try {
      const completion = await this.habitsService.complete(
        userId,
        matchedHabit.id,
        targetDate,
        'chat',
        notes
      );

      // Get updated habit with streak
      const updatedHabit = await this.habitsService.findById(userId, matchedHabit.id);

      this.logger.log(
        `record_habit completed habit ${matchedHabit.id} ("${matchedHabit.name}") for ${targetDate}`
      );

      return createSuccessResult(toolCall, {
        success: true,
        completionId: completion.id,
        habitId: matchedHabit.id,
        habitName: matchedHabit.name,
        date: targetDate,
        currentStreak: updatedHabit?.currentStreak ?? 0,
        message: `Hábito "${matchedHabit.name}" ${matchedHabit.icon} marcado como concluído em ${targetDate}. Sequência: ${String(updatedHabit?.currentStreak ?? 0)} dias 🔥`,
      });
    } catch (error) {
      // Handle "already completed" error gracefully
      if (error instanceof Error && error.message.includes('já foi marcado')) {
        return createSuccessResult(toolCall, {
          success: false,
          habitId: matchedHabit.id,
          habitName: matchedHabit.name,
          date: targetDate,
          message: `O hábito "${matchedHabit.name}" já estava marcado como concluído em ${targetDate}.`,
          alreadyCompleted: true,
        });
      }
      throw error;
    }
  }

  /**
   * Execute get_habits tool
   *
   * @see docs/specs/domains/tracking.md §7.5 for spec
   */
  private async executeGetHabits(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getHabitsParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { includeStreaks, includeCompletionsToday } = parseResult.data;

    this.logger.debug(
      `get_habits params: includeStreaks=${String(includeStreaks)}, includeCompletionsToday=${String(includeCompletionsToday)}`
    );

    // Get habits (already includes streaks from findAll)
    const habits = await this.habitsService.findAll(userId);

    // Get today's completions if requested
    let todayCompletions = new Set<string>();
    if (includeCompletionsToday) {
      // Get user timezone for accurate "today" calculation
      const timezone = await this.getUserTimezone(userId);
      const today = getTodayInTimezone(timezone);
      const habitsForDate = await this.habitsService.getHabitsForDate(userId, today);
      todayCompletions = new Set(
        habitsForDate.filter((h) => h.completed).map((h) => h.habit.id)
      );
    }

    // Format response
    const formattedHabits = habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      frequency: habit.frequency,
      periodOfDay: habit.periodOfDay,
      ...(includeStreaks
        ? {
            currentStreak: habit.currentStreak,
            longestStreak: habit.longestStreak,
          }
        : {}),
      ...(includeCompletionsToday
        ? {
            completedToday: todayCompletions.has(habit.id),
          }
        : {}),
    }));

    this.logger.debug(`get_habits found ${String(habits.length)} habits`);

    return createSuccessResult(toolCall, {
      count: habits.length,
      habits: formattedHabits,
      message:
        habits.length === 0
          ? 'Você ainda não tem hábitos cadastrados.'
          : `Encontrados ${String(habits.length)} hábitos.`,
    });
  }
}
