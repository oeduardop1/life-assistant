'use client';

import { useState } from 'react';
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
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Expense, RecurringScope } from '../../types';

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
 * If the expense is recurring, shows scope selection dialog before applying changes.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditExpenseModal({
  expense,
  open,
  onOpenChange,
}: EditExpenseModalProps) {
  const updateExpense = useUpdateExpense();
  const [pendingData, setPendingData] = useState<ExpenseFormData | null>(null);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

  const executeUpdate = async (data: ExpenseFormData, scope?: RecurringScope) => {
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
        scope,
      });

      toast.success('Despesa atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar despesa. Tente novamente.');
    }
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    if (!expense) return;

    if (expense.recurringGroupId) {
      setPendingData(data);
      setScopeDialogOpen(true);
    } else {
      await executeUpdate(data);
    }
  };

  const handleScopeConfirm = async (scope: RecurringScope) => {
    if (pendingData) {
      await executeUpdate(pendingData, scope);
      setPendingData(null);
      setScopeDialogOpen(false);
    }
  };

  if (!expense) return null;

  return (
    <>
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

      <RecurringScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        onConfirm={handleScopeConfirm}
        title="Editar despesa recorrente"
        description="Esta despesa faz parte de uma série recorrente. Escolha o escopo da alteração."
        actionLabel="Salvar"
        isPending={updateExpense.isPending}
      />
    </>
  );
}
