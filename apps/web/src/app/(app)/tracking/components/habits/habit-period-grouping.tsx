'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sun, CloudSun, Moon, Clock, Flame, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { HabitWithStreak, PeriodOfDay } from '../../types';

interface HabitPeriodGroupingProps {
  /** List of habits to group */
  habits: HabitWithStreak[];
  /** Currently selected habit ID */
  selectedId: string | null;
  /** Callback when a habit is selected */
  onSelect: (id: string) => void;
  /** Callback to create new habit */
  onCreateNew: () => void;
  /** Loading state */
  isLoading?: boolean;
}

interface PeriodConfig {
  key: PeriodOfDay;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}

const periodConfigs: PeriodConfig[] = [
  {
    key: 'morning',
    label: 'Manhã',
    icon: <Sun className="h-4 w-4 text-amber-500" />,
    gradient: 'from-amber-500/10 to-transparent',
  },
  {
    key: 'afternoon',
    label: 'Tarde',
    icon: <CloudSun className="h-4 w-4 text-orange-400" />,
    gradient: 'from-orange-400/10 to-transparent',
  },
  {
    key: 'evening',
    label: 'Noite',
    icon: <Moon className="h-4 w-4 text-indigo-400" />,
    gradient: 'from-indigo-400/10 to-transparent',
  },
  {
    key: 'anytime',
    label: 'Qualquer Hora',
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    gradient: 'from-muted/30 to-transparent',
  },
];

/**
 * HabitPeriodGrouping - Alternative view grouping habits by period of day
 *
 * Features:
 * - Groups habits by morning/afternoon/evening/anytime
 * - Shows habit icon, name, and current streak
 * - Click to select and show detail panel
 * - Staggered entrance animations
 * - Collapsible groups (future enhancement)
 */
export function HabitPeriodGrouping({
  habits,
  selectedId,
  onSelect,
  onCreateNew,
  isLoading,
}: HabitPeriodGroupingProps) {
  const prefersReducedMotion = useReducedMotion();

  // Group habits by period of day
  const groupedHabits = useMemo(() => {
    const groups: Record<PeriodOfDay, HabitWithStreak[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      anytime: [],
    };

    for (const habit of habits) {
      groups[habit.periodOfDay].push(habit);
    }

    // Sort each group by sortOrder
    for (const key of Object.keys(groups) as PeriodOfDay[]) {
      groups[key].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return groups;
  }, [habits]);

  if (isLoading) {
    return <HabitPeriodGroupingSkeleton />;
  }

  if (habits.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center bg-gradient-to-br from-background to-muted/20">
        <p className="text-muted-foreground mb-4">
          Nenhum hábito criado ainda.
        </p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Criar primeiro hábito
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {periodConfigs.map((config, groupIndex) => {
        const habitsInPeriod = groupedHabits[config.key];
        if (habitsInPeriod.length === 0) return null;

        return (
          <motion.div
            key={config.key}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="rounded-xl border overflow-hidden"
          >
            {/* Group Header */}
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r',
                config.gradient
              )}
            >
              {config.icon}
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-xs text-muted-foreground">
                ({habitsInPeriod.length})
              </span>
            </div>

            {/* Habits List */}
            <div className="divide-y divide-border/50">
              {habitsInPeriod.map((habit, habitIndex) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  isSelected={habit.id === selectedId}
                  onSelect={() => onSelect(habit.id)}
                  animationDelay={
                    prefersReducedMotion
                      ? 0
                      : groupIndex * 0.1 + habitIndex * 0.05
                  }
                />
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Add New Habit Button */}
      <motion.button
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onCreateNew}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">Adicionar hábito</span>
      </motion.button>
    </div>
  );
}

interface HabitRowProps {
  habit: HabitWithStreak;
  isSelected: boolean;
  onSelect: () => void;
  animationDelay: number;
}

function HabitRow({
  habit,
  isSelected,
  onSelect,
  animationDelay,
}: HabitRowProps) {
  const prefersReducedMotion = useReducedMotion();

  const hasStreak = habit.currentStreak > 0;
  const isHotStreak = habit.currentStreak >= 7;

  return (
    <motion.button
      initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        isSelected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : 'hover:bg-muted/50'
      )}
    >
      {/* Habit Icon */}
      <div
        className="flex-shrink-0 p-2 rounded-lg"
        style={{
          backgroundColor: habit.color ? `${habit.color}15` : 'var(--muted)',
        }}
      >
        <span className="text-base">{habit.icon}</span>
      </div>

      {/* Habit Name */}
      <span className="flex-1 font-medium truncate">{habit.name}</span>

      {/* Streak Badge (compact) */}
      <div
        className={cn(
          'flex items-center gap-1 text-sm',
          hasStreak ? 'text-orange-500' : 'text-muted-foreground'
        )}
      >
        <motion.span
          animate={
            isHotStreak && !prefersReducedMotion
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Flame
            className={cn(
              'h-4 w-4',
              hasStreak ? 'text-orange-500' : 'text-muted-foreground',
              isHotStreak && 'drop-shadow-[0_0_4px_var(--journal-fire-glow)]'
            )}
          />
        </motion.span>
        <span className="tabular-nums font-medium">{habit.currentStreak}</span>
      </div>
    </motion.button>
  );
}

function HabitPeriodGroupingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((group) => (
        <div key={group} className="rounded-xl border overflow-hidden">
          <Skeleton className="h-10 w-full rounded-none" />
          <div className="divide-y">
            {[1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
