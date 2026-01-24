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
import { useDeleteBill } from '../../hooks/use-bills';
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Bill, RecurringScope } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DeleteBillDialogProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DeleteBillDialog - Confirmation dialog for deleting a bill
 *
 * If the bill is recurring, shows scope selection dialog instead.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteBillDialog({
  bill,
  open,
  onOpenChange,
}: DeleteBillDialogProps) {
  const deleteBill = useDeleteBill();

  const executeDelete = async (scope?: RecurringScope) => {
    if (!bill) return;

    try {
      await deleteBill.mutateAsync({
        id: bill.id,
        monthYear: bill.monthYear,
        scope,
      });

      toast.success('Conta excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir conta. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    await executeDelete();
  };

  const handleScopeConfirm = async (scope: RecurringScope) => {
    await executeDelete(scope);
  };

  if (!bill) return null;

  // Recurring bill: show scope dialog
  if (bill.recurringGroupId) {
    return (
      <RecurringScopeDialog
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={handleScopeConfirm}
        title="Excluir conta recorrente"
        description={`Escolha o escopo da exclusão para "${bill.name}".`}
        actionLabel="Excluir"
        isDestructive
        isPending={deleteBill.isPending}
      />
    );
  }

  // Non-recurring bill: show simple confirm dialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-bill-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a conta{' '}
            <span className="font-medium text-foreground">&ldquo;{bill.name}&rdquo;</span>?
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteBill.isPending}
            data-testid="delete-bill-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteBill.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-bill-confirm"
          >
            {deleteBill.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
