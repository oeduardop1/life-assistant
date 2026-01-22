'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateIncome } from '../../hooks/use-incomes';
import { IncomeForm, type IncomeFormData } from './income-form';
import type { Income } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface EditIncomeModalProps {
  income: Income | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditIncomeModal - Modal for editing an existing income
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditIncomeModal({
  income,
  open,
  onOpenChange,
}: EditIncomeModalProps) {
  const updateIncome = useUpdateIncome();

  const handleSubmit = async (data: IncomeFormData) => {
    if (!income) return;

    try {
      await updateIncome.mutateAsync({
        id: income.id,
        data: {
          name: data.name,
          type: data.type,
          frequency: data.frequency,
          expectedAmount: data.expectedAmount,
          actualAmount: data.actualAmount,
          isRecurring: data.isRecurring,
        },
      });

      toast.success('Renda atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar renda. Tente novamente.');
    }
  };

  if (!income) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="edit-income-modal">
        <DialogHeader>
          <DialogTitle>Editar Renda</DialogTitle>
          <DialogDescription>
            Atualize as informações da renda.
          </DialogDescription>
        </DialogHeader>

        <IncomeForm
          defaultValues={{
            name: income.name,
            type: income.type,
            frequency: income.frequency,
            expectedAmount: income.expectedAmount,
            actualAmount: income.actualAmount,
            isRecurring: income.isRecurring,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={updateIncome.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
