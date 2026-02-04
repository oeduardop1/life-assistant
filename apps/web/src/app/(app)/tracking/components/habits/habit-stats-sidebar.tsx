'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StreakBadge } from '../day-detail/streak-badge';

interface HabitStatsSidebarProps {
  /** Current streak count */
  currentStreak: number;
  /** Longest streak (record) */
  longestStreak: number;
  /** Completion rate percentage (0-100) */
  completionRate: number;
  /** Total completions count */
  totalCompletions: number;
  /** Habit's color for accent */
  habitColor?: string | null;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * HabitStatsSidebar - Statistics sidebar for the habit detail panel
 *
 * Features:
 * - Current streak with StreakBadge (fire animation)
 * - Longest streak (record)
 * - Consistency percentage with animated bar
 * - Total completions count
 */
export function HabitStatsSidebar({
  currentStreak,
  longestStreak,
  completionRate,
  totalCompletions,
  habitColor,
  isLoading,
}: HabitStatsSidebarProps) {
  if (isLoading) {
    return <HabitStatsSidebarSkeleton />;
  }

  const accentColor = habitColor || 'var(--habit-dot-completed)';

  return (
    <div className="space-y-4">
      {/* Current Streak - Hero stat */}
      <div
        className="p-4 rounded-xl"
        style={{
          backgroundColor: habitColor ? `${habitColor}10` : 'var(--muted)',
        }}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Streak Atual
        </p>
        <StreakBadge streak={currentStreak} className="text-lg" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Recorde"
          value={`${longestStreak} ${longestStreak === 1 ? 'dia' : 'dias'}`}
          icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />}
        />
        <StatCard
          label="Total"
          value={`${totalCompletions}`}
          icon={<Target className="h-3.5 w-3.5" style={{ color: accentColor }} />}
        />
      </div>

      {/* Consistency Bar */}
      <div className="p-4 rounded-xl bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <p className="text-xs font-medium uppercase tracking-wider">
              Consistência
            </p>
          </div>
          <span className="text-sm font-semibold">{completionRate}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              backgroundColor: accentColor,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Últimas 12 semanas
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function HabitStatsSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}
