'use client';

import { useState } from 'react';
import { Plus, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HabitList,
  CreateHabitModal,
  EditHabitModal,
  DeleteHabitDialog,
} from '../components/habits';
import { useHabits } from '../hooks/use-habits';
import type { HabitWithStreak } from '../types';

/**
 * Habits management page
 *
 * Allows creating, editing, and deleting habits.
 * Accessible from the tracking module.
 */
export default function HabitsPage() {
  const { data: habits, isLoading, isError } = useHabits();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitWithStreak | null>(
    null
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Gerenciar Hábitos
          </CardTitle>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Hábito
          </Button>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-center py-8 text-muted-foreground">
              Erro ao carregar hábitos. Tente novamente.
            </p>
          ) : (
            <HabitList
              habits={habits ?? []}
              isLoading={isLoading}
              onEdit={setEditingHabit}
              onDelete={setDeletingHabit}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateHabitModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditHabitModal
        habit={editingHabit}
        onClose={() => setEditingHabit(null)}
      />

      <DeleteHabitDialog
        habit={deletingHabit}
        onClose={() => setDeletingHabit(null)}
      />
    </div>
  );
}
