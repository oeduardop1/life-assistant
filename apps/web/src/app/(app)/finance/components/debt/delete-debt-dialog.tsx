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
import { useDeleteDebt } from '../../hooks/use-debts';
import type { Debt } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DeleteDebtDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DeleteDebtDialog - Confirmation dialog for deleting a debt
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteDebtDialog({
  debt,
  open,
  onOpenChange,
}: DeleteDebtDialogProps) {
  const deleteDebt = useDeleteDebt();

  const handleDelete = async () => {
    if (!debt) return;

    try {
      await deleteDebt.mutateAsync(debt.id);

      toast.success('Dívida excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir dívida. Tente novamente.');
    }
  };

  if (!debt) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-debt-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Dívida</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a dívida{' '}
            <span className="font-medium text-foreground">&ldquo;{debt.name}&rdquo;</span>?
            <br />
            Esta ação não pode ser desfeita e todo o histórico de pagamentos será perdido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteDebt.isPending}
            data-testid="delete-debt-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteDebt.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-debt-confirm"
          >
            {deleteDebt.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
