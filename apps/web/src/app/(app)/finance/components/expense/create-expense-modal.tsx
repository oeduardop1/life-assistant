'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateExpense } from '../../hooks/use-expenses';
import { ExpenseForm, type ExpenseFormData } from './expense-form';

// =============================================================================
// Props
// =============================================================================

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthYear: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateExpenseModal - Modal for creating a new variable expense
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateExpenseModal({
  open,
  onOpenChange,
  monthYear,
}: CreateExpenseModalProps) {
  const createExpense = useCreateExpense();

  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      await createExpense.mutateAsync({
        name: data.name,
        category: data.category,
        expectedAmount: data.expectedAmount,
        actualAmount: data.actualAmount,
        isRecurring: data.isRecurring,
        monthYear,
      });

      toast.success('Despesa criada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar despesa. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-expense-modal">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
          <DialogDescription>
            Adicione uma nova despesa variável para este mês.
          </DialogDescription>
        </DialogHeader>

        <ExpenseForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createExpense.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
