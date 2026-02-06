'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HabitForm } from './habit-form';
import { useCreateHabit } from '../../hooks/use-habits';

interface CreateHabitModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

/**
 * CreateHabitModal - Modal for creating a new habit
 */
export function CreateHabitModal({ open, onClose }: CreateHabitModalProps) {
  const createHabit = useCreateHabit();

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    icon: string;
    color?: string;
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
    frequencyDays?: number[];
    periodOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  }) => {
    try {
      await createHabit.mutateAsync({
        name: values.name,
        description: values.description,
        icon: values.icon,
        color: values.color,
        frequency: values.frequency,
        frequencyDays: values.frequencyDays,
        periodOfDay: values.periodOfDay,
      });

      toast.success(`"${values.name}" foi adicionado aos seus hábitos.`);

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o hábito. Tente novamente.'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Hábito</DialogTitle>
        </DialogHeader>
        <HabitForm
          onSubmit={handleSubmit}
          isLoading={createHabit.isPending}
          submitLabel="Criar Hábito"
        />
      </DialogContent>
    </Dialog>
  );
}
