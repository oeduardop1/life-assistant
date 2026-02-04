'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Archive, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHabitCompletions } from '../../hooks/use-habits';
import type { HabitWithStreak } from '../../types';
import { habitFrequencyLabels, periodOfDayLabels } from '../../types';
import { CompletionHeatmap } from './completion-heatmap';
import { HabitStatsSidebar } from './habit-stats-sidebar';

interface HabitDetailPanelProps {
  /** The habit to display */
  habit: HabitWithStreak;
  /** Callback when edit button is clicked */
  onEdit: () => void;
  /** Callback when archive button is clicked */
  onArchive: () => void;
}

/**
 * HabitDetailPanel - Unified view of heatmap + stats + timeline for a single habit
 *
 * Features:
 * - Header with habit icon, name, frequency, period
 * - Grid layout with CompletionHeatmap + HabitStatsSidebar
 * - Recent timeline section showing last 7 completions
 * - Edit and Archive buttons
 * - Smooth transitions when habit changes
 */
export function HabitDetailPanel({
  habit,
  onEdit,
  onArchive,
}: HabitDetailPanelProps) {
  const { data: completionsData, isLoading } = useHabitCompletions(habit.id);

  // Get recent completions for timeline (last 7 entries)
  const recentCompletions = useMemo(() => {
    if (!completionsData?.completions) return [];
    return completionsData.completions.slice(0, 7);
  }, [completionsData]);

  const defaultColors = {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  };

  const hasCustomColor = !!habit.color;

  return (
    <motion.div
      key={habit.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl border p-6',
        'bg-gradient-to-br from-background to-muted/20',
        !hasCustomColor && defaultColors.border
      )}
      style={
        hasCustomColor
          ? {
              borderColor: `${habit.color}40`,
            }
          : undefined
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn('p-2.5 rounded-xl', !hasCustomColor && defaultColors.bg)}
            style={
              hasCustomColor
                ? {
                    backgroundColor: `${habit.color}15`,
                  }
                : undefined
            }
          >
            <span className="text-xl">{habit.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">
              {habitFrequencyLabels[habit.frequency]} &bull;{' '}
              {periodOfDayLabels[habit.periodOfDay]}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onArchive}>
            <Archive className="h-4 w-4 mr-1.5" />
            Arquivar
          </Button>
        </div>
      </div>

      {/* Description (if present) */}
      {habit.description && (
        <p className="text-sm text-muted-foreground mb-6">{habit.description}</p>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        {/* Heatmap Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Histórico de Conclusões
          </h4>
          <CompletionHeatmap
            completions={completionsData?.completions ?? []}
            habitColor={habit.color}
            frequency={habit.frequency}
            frequencyDays={habit.frequencyDays}
            isLoading={isLoading}
          />
        </div>

        {/* Stats Sidebar */}
        <HabitStatsSidebar
          currentStreak={completionsData?.stats.currentStreak ?? habit.currentStreak}
          longestStreak={completionsData?.stats.longestStreak ?? habit.longestStreak}
          completionRate={completionsData?.stats.completionRate ?? 0}
          totalCompletions={completionsData?.stats.totalCompletions ?? 0}
          habitColor={habit.color}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Timeline */}
      {recentCompletions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Conclusões Recentes
          </h4>
          <div className="space-y-2">
            {recentCompletions.map((completion) => (
              <TimelineEntry
                key={completion.id}
                date={completion.completionDate}
                completedAt={completion.completedAt}
                habitColor={habit.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no data */}
      {!isLoading && completionsData?.completions.length === 0 && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <EmptyTimeline habitName={habit.name} />
        </div>
      )}
    </motion.div>
  );
}

interface TimelineEntryProps {
  date: string;
  completedAt: string;
  habitColor?: string | null;
}

function TimelineEntry({ date, completedAt, habitColor }: TimelineEntryProps) {
  const formattedDate = useMemo(() => {
    const dateObj = parseISO(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === yesterdayStr) return 'Ontem';
    return format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
  }, [date]);

  const formattedTime = useMemo(() => {
    return format(parseISO(completedAt), 'HH:mm');
  }, [completedAt]);

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: habitColor || 'var(--habit-dot-completed)',
        }}
      />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm capitalize">{formattedDate}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

function EmptyTimeline({ habitName }: { habitName: string }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-3">
        <X className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">
        Nenhuma conclusão registrada para {habitName}
      </p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Complete este hábito para começar a rastrear
      </p>
    </div>
  );
}

/**
 * Skeleton for loading state
 */
export function HabitDetailPanelSkeleton() {
  return (
    <div className="rounded-2xl border p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-[140px] rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
