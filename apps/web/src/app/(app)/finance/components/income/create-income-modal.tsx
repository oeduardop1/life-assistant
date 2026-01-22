'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateIncome } from '../../hooks/use-incomes';
import { IncomeForm, type IncomeFormData } from './income-form';

// =============================================================================
// Props
// =============================================================================

interface CreateIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthYear: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateIncomeModal - Modal for creating a new income
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateIncomeModal({
  open,
  onOpenChange,
  monthYear,
}: CreateIncomeModalProps) {
  const createIncome = useCreateIncome();

  const handleSubmit = async (data: IncomeFormData) => {
    try {
      await createIncome.mutateAsync({
        name: data.name,
        type: data.type,
        frequency: data.frequency,
        expectedAmount: data.expectedAmount,
        actualAmount: data.actualAmount ?? undefined,
        isRecurring: data.isRecurring,
        monthYear,
      });

      toast.success('Renda criada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar renda. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-income-modal">
        <DialogHeader>
          <DialogTitle>Nova Renda</DialogTitle>
          <DialogDescription>
            Adicione uma nova fonte de renda para este mês.
          </DialogDescription>
        </DialogHeader>

        <IncomeForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createIncome.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
