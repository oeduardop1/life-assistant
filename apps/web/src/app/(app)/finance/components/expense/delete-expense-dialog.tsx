'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useDeleteExpense } from '../../hooks/use-expenses';
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Expense, RecurringScope } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DeleteExpenseDialog - Confirmation dialog for deleting a variable expense
 *
 * If the expense is recurring, shows scope selection dialog instead.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteExpenseDialog({
  expense,
  open,
  onOpenChange,
}: DeleteExpenseDialogProps) {
  const deleteExpense = useDeleteExpense();

  const executeDelete = async (scope?: RecurringScope) => {
    if (!expense) return;

    try {
      await deleteExpense.mutateAsync({
        id: expense.id,
        monthYear: expense.monthYear,
        scope,
      });

      toast.success('Despesa excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir despesa. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    await executeDelete();
  };

  const handleScopeConfirm = async (scope: RecurringScope) => {
    await executeDelete(scope);
  };

  if (!expense) return null;

  // Recurring expense: show scope dialog
  if (expense.recurringGroupId) {
    return (
      <RecurringScopeDialog
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={handleScopeConfirm}
        title="Excluir despesa recorrente"
        description={`Escolha o escopo da exclusão para "${expense.name}".`}
        actionLabel="Excluir"
        isDestructive
        isPending={deleteExpense.isPending}
      />
    );
  }

  // Non-recurring expense: show simple confirm dialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-expense-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a despesa{' '}
            <span className="font-medium text-foreground">&ldquo;{expense.name}&rdquo;</span>?
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteExpense.isPending}
            data-testid="delete-expense-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteExpense.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-expense-confirm"
          >
            {deleteExpense.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
