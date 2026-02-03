'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HabitForm } from './habit-form';
import { useUpdateHabit } from '../../hooks/use-habits';
import type { HabitWithStreak } from '../../types';

interface EditHabitModalProps {
  /** Habit to edit */
  habit: HabitWithStreak | null;
  /** Close handler */
  onClose: () => void;
}

/**
 * EditHabitModal - Modal for editing an existing habit
 */
export function EditHabitModal({ habit, onClose }: EditHabitModalProps) {
  const updateHabit = useUpdateHabit();

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    icon: string;
    color?: string;
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
    periodOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  }) => {
    if (!habit) return;

    try {
      await updateHabit.mutateAsync({
        habitId: habit.id,
        data: {
          name: values.name,
          description: values.description,
          icon: values.icon,
          color: values.color,
          frequency: values.frequency,
          periodOfDay: values.periodOfDay,
        },
      });

      toast.success(`"${values.name}" foi atualizado com sucesso.`);

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o hábito. Tente novamente.'
      );
    }
  };

  return (
    <Dialog open={habit !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Hábito</DialogTitle>
        </DialogHeader>
        {habit && (
          <HabitForm
            defaultValues={{
              name: habit.name,
              description: habit.description ?? undefined,
              icon: habit.icon,
              color: habit.color ?? undefined,
              frequency: habit.frequency,
              periodOfDay: habit.periodOfDay,
            }}
            onSubmit={handleSubmit}
            isLoading={updateHabit.isPending}
            submitLabel="Salvar Alterações"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
