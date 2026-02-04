'use client';

import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { HabitWithStreak } from '../../types';

interface HabitSelectorProps {
  habits: HabitWithStreak[];
  selectedId: string | null;
  onSelect: (habitId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
  className?: string;
}

// Default colors for habits without custom color
const defaultHabitColors = {
  bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  text: 'text-emerald-600 dark:text-emerald-400',
  border: 'border-emerald-200 dark:border-emerald-800',
};

/**
 * HabitSelector - Horizontal pill-style selector for habits
 *
 * Features:
 * - Smooth selection animation with layoutId
 * - Color coding from habit's color property
 * - Horizontally scrollable on mobile
 * - Keyboard accessible
 * - "+ Novo" button to create habits
 */
export function HabitSelector({
  habits,
  selectedId,
  onSelect,
  onCreateNew,
  isLoading,
  className,
}: HabitSelectorProps) {
  if (isLoading) {
    return <HabitSelectorSkeleton />;
  }

  if (habits.length === 0) {
    return (
      <div className={cn('flex gap-2', className)}>
        <button
          onClick={onCreateNew}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium',
            'border border-dashed border-muted-foreground/30',
            'text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50',
            'transition-colors'
          )}
        >
          <Plus className="h-4 w-4" />
          Criar primeiro hábito
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1',
        className
      )}
      role="tablist"
      aria-label="Selecionar hábito"
    >
      {habits.map((habit) => {
        const isSelected = selectedId === habit.id;
        const hasCustomColor = !!habit.color;

        return (
          <button
            key={habit.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(habit.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
              'border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
              isSelected && !hasCustomColor && cn(defaultHabitColors.bg, defaultHabitColors.text, defaultHabitColors.border),
              !isSelected && 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            style={
              hasCustomColor && isSelected && habit.color
                ? {
                    backgroundColor: `${habit.color}15`,
                    borderColor: `${habit.color}40`,
                    color: habit.color,
                  }
                : undefined
            }
          >
            {isSelected && !hasCustomColor && (
              <motion.div
                layoutId="habit-selector-bg"
                className={cn(
                  'absolute inset-0 rounded-full border',
                  defaultHabitColors.bg,
                  defaultHabitColors.border
                )}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <span className="text-base">{habit.icon}</span>
              {habit.name}
            </span>
          </button>
        );
      })}

      {/* Separator and New button */}
      <div className="w-px bg-border self-stretch my-1" />
      <button
        onClick={onCreateNew}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap',
          'border border-dashed border-muted-foreground/30',
          'text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary'
        )}
      >
        <Plus className="h-4 w-4" />
        Novo
      </button>
    </div>
  );
}

function HabitSelectorSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-28 rounded-full" />
      ))}
    </div>
  );
}
