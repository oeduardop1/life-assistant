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
import { useDeleteIncome } from '../../hooks/use-incomes';
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Income, RecurringScope } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DeleteIncomeDialogProps {
  income: Income | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DeleteIncomeDialog - Confirmation dialog for deleting an income
 *
 * If the income is recurring, shows scope selection dialog instead.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteIncomeDialog({
  income,
  open,
  onOpenChange,
}: DeleteIncomeDialogProps) {
  const deleteIncome = useDeleteIncome();

  const executeDelete = async (scope?: RecurringScope) => {
    if (!income) return;

    try {
      await deleteIncome.mutateAsync({
        id: income.id,
        monthYear: income.monthYear,
        scope,
      });

      toast.success('Renda excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir renda. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    await executeDelete();
  };

  const handleScopeConfirm = async (scope: RecurringScope) => {
    await executeDelete(scope);
  };

  if (!income) return null;

  // Recurring income: show scope dialog
  if (income.recurringGroupId) {
    return (
      <RecurringScopeDialog
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={handleScopeConfirm}
        title="Excluir renda recorrente"
        description={`Escolha o escopo da exclusão para "${income.name}".`}
        actionLabel="Excluir"
        isDestructive
        isPending={deleteIncome.isPending}
      />
    );
  }

  // Non-recurring income: show simple confirm dialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-income-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Renda</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a renda{' '}
            <span className="font-medium text-foreground">&ldquo;{income.name}&rdquo;</span>?
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteIncome.isPending}
            data-testid="delete-income-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteIncome.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-income-confirm"
          >
            {deleteIncome.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
