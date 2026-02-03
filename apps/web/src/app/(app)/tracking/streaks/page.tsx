'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHabitsByStreak } from '../hooks/use-habits';
import { habitFrequencyLabels } from '../types';
import { useHabits } from '../hooks/use-habits';

/**
 * Streaks page - Shows all habits with their current and longest streaks
 *
 * @see docs/specs/domains/tracking.md §3.5 for Streaks tab
 */
export default function StreaksPage() {
  const { habits: streakData, isLoading, isError } = useHabitsByStreak();
  const { data: habitsWithDetails } = useHabits();

  // Create a map of habit details for frequency info
  const habitDetailsMap = new Map(
    habitsWithDetails?.map((h) => [h.id, h]) ?? []
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              Erro ao carregar streaks. Tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (streakData.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Nenhum hábito cadastrado ainda.
              <br />
              Crie hábitos para começar a acompanhar seus streaks!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streaks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {streakData.map((habit) => {
            const details = habitDetailsMap.get(habit.habitId);
            const frequency = details?.frequency ?? 'daily';
            const isRecord =
              habit.currentStreak > 0 &&
              habit.currentStreak >= habit.longestStreak;
            const hasStreak = habit.currentStreak > 0;

            return (
              <div
                key={habit.habitId}
                className={cn(
                  'flex items-center justify-between p-4 border rounded-lg transition-colors',
                  hasStreak ? 'bg-muted/30' : 'bg-background'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{habit.icon}</span>
                  <div>
                    <p className="font-medium">{habit.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {habitFrequencyLabels[frequency]}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'font-medium flex items-center justify-end gap-1',
                      hasStreak ? 'text-orange-500' : 'text-muted-foreground'
                    )}
                  >
                    <Flame
                      className={cn(
                        'h-4 w-4',
                        hasStreak ? 'text-orange-500' : 'text-muted-foreground'
                      )}
                    />
                    {habit.currentStreak} {habit.currentStreak === 1 ? 'dia' : 'dias'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    {isRecord && habit.currentStreak > 0 && (
                      <Trophy className="h-3 w-3 text-yellow-500" />
                    )}
                    Recorde: {habit.longestStreak}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
