'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useDeleteHabit } from '../../hooks/use-habits';
import type { HabitWithStreak } from '../../types';

interface DeleteHabitDialogProps {
  /** Habit to delete */
  habit: HabitWithStreak | null;
  /** Close handler */
  onClose: () => void;
}

/**
 * DeleteHabitDialog - Confirmation dialog for deleting a habit
 */
export function DeleteHabitDialog({ habit, onClose }: DeleteHabitDialogProps) {
  const deleteHabit = useDeleteHabit();

  const handleDelete = async () => {
    if (!habit) return;

    try {
      await deleteHabit.mutateAsync(habit.id);

      toast.success(`"${habit.name}" foi removido dos seus hábitos.`);

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o hábito. Tente novamente.'
      );
    }
  };

  return (
    <AlertDialog open={habit !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover hábito?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o hábito &quot;{habit?.name}&quot;?
            <br />
            <br />
            Esta ação não pode ser desfeita. O histórico de conclusões será
            mantido, mas o hábito não aparecerá mais na sua lista.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteHabit.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
