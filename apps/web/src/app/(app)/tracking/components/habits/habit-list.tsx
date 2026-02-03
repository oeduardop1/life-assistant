'use client';

import { MoreHorizontal, Pencil, Trash2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { HabitWithStreak } from '../../types';
import { habitFrequencyLabels, periodOfDayLabels } from '../../types';

interface HabitListProps {
  /** List of habits */
  habits: HabitWithStreak[];
  /** Loading state */
  isLoading?: boolean;
  /** Edit handler */
  onEdit: (habit: HabitWithStreak) => void;
  /** Delete handler */
  onDelete: (habit: HabitWithStreak) => void;
}

/**
 * HabitList - List of habits with edit/delete actions
 */
export function HabitList({
  habits,
  isLoading = false,
  onEdit,
  onDelete,
}: HabitListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum hábito cadastrado ainda.</p>
        <p className="text-sm mt-1">
          Clique em &quot;Novo Hábito&quot; para começar!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <HabitListItem
          key={habit.id}
          habit={habit}
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit)}
        />
      ))}
    </div>
  );
}

interface HabitListItemProps {
  habit: HabitWithStreak;
  onEdit: () => void;
  onDelete: () => void;
}

function HabitListItem({ habit, onEdit, onDelete }: HabitListItemProps) {
  const hasStreak = habit.currentStreak > 0;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{habit.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{habit.name}</p>
            {hasStreak && (
              <span className="text-xs text-orange-500 flex items-center gap-0.5">
                <Flame className="h-3 w-3" />
                {habit.currentStreak}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {habitFrequencyLabels[habit.frequency]} •{' '}
            {periodOfDayLabels[habit.periodOfDay]}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
