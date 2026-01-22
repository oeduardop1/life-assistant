'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateExpense } from '../../hooks/use-expenses';
import { ExpenseForm, type ExpenseFormData } from './expense-form';
import type { Expense } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface EditExpenseModalProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditExpenseModal - Modal for editing an existing variable expense
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditExpenseModal({
  expense,
  open,
  onOpenChange,
}: EditExpenseModalProps) {
  const updateExpense = useUpdateExpense();

  const handleSubmit = async (data: ExpenseFormData) => {
    if (!expense) return;

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        data: {
          name: data.name,
          category: data.category,
          expectedAmount: data.expectedAmount,
          actualAmount: data.actualAmount,
          isRecurring: data.isRecurring,
        },
      });

      toast.success('Despesa atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar despesa. Tente novamente.');
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="edit-expense-modal">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
          <DialogDescription>
            Atualize as informações da despesa.
          </DialogDescription>
        </DialogHeader>

        <ExpenseForm
          defaultValues={{
            name: expense.name,
            category: expense.category,
            expectedAmount: expense.expectedAmount,
            actualAmount: expense.actualAmount,
            isRecurring: expense.isRecurring,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={updateExpense.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
