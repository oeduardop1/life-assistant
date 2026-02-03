'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { StreakBadge } from './streak-badge';
import type { HabitWithCompletion } from '../../types';
import { periodOfDayLabels } from '../../types';

interface HabitCheckboxProps {
  /** Habit with completion status */
  habitData: HabitWithCompletion;
  /** Whether checkbox is disabled (loading) */
  disabled?: boolean;
  /** Toggle completion handler */
  onToggle: (habitId: string, completed: boolean) => void;
}

/**
 * HabitCheckbox - Checkbox for marking a habit as completed
 *
 * Features:
 * - Checkbox with habit name and icon
 * - Period of day indicator
 * - Current streak badge
 * - Optimistic update feedback
 */
export function HabitCheckbox({
  habitData,
  disabled = false,
  onToggle,
}: HabitCheckboxProps) {
  const { habit, completed } = habitData;
  const periodLabel = periodOfDayLabels[habit.periodOfDay];

  const handleChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onToggle(habit.id, checked);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        completed ? 'bg-muted/50 border-muted' : 'bg-background border-border',
        disabled && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          id={`habit-${habit.id}`}
          checked={completed}
          onCheckedChange={handleChange}
          disabled={disabled}
          className="h-5 w-5"
        />
        <div className="flex items-center gap-2">
          <span
            className="text-lg rounded-md px-1"
            style={{
              backgroundColor: habit.color ? `${habit.color}20` : undefined,
            }}
          >
            {habit.icon}
          </span>
          <div>
            <label
              htmlFor={`habit-${habit.id}`}
              className={cn(
                'text-sm font-medium cursor-pointer',
                completed && 'line-through text-muted-foreground'
              )}
            >
              {habit.name}
            </label>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
      </div>

      <StreakBadge streak={habit.currentStreak} />
    </div>
  );
}
