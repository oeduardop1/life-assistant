'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { HabitCheckbox } from './habit-checkbox';
import type { HabitWithCompletion } from '../../types';

interface HabitsSectionProps {
  /** Habits with completion status */
  habits: HabitWithCompletion[];
  /** Loading state */
  isLoading?: boolean;
  /** Habit ID currently being toggled */
  togglingHabitId?: string | null;
  /** Toggle completion handler */
  onToggle: (habitId: string, completed: boolean) => void;
}

/**
 * HabitsSection - List of habits for a specific day
 *
 * Features:
 * - List of habit checkboxes
 * - Loading skeleton
 * - Empty state when no habits
 */
export function HabitsSection({
  habits,
  isLoading = false,
  togglingHabitId,
  onToggle,
}: HabitsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hábitos
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hábitos
        </h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum hábito cadastrado. Crie hábitos na aba de gerenciamento.
        </p>
      </div>
    );
  }

  const completedCount = habits.filter((h) => h.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hábitos
        </h3>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{habits.length} completos
        </span>
      </div>
      <div className="space-y-2">
        {habits.map((habitData) => (
          <HabitCheckbox
            key={habitData.habit.id}
            habitData={habitData}
            disabled={togglingHabitId === habitData.habit.id}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
