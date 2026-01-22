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
import type { Bill } from '../../types';

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
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteBillDialog({
  bill,
  open,
  onOpenChange,
}: DeleteBillDialogProps) {
  const deleteBill = useDeleteBill();

  const handleDelete = async () => {
    if (!bill) return;

    try {
      await deleteBill.mutateAsync({
        id: bill.id,
        monthYear: bill.monthYear,
      });

      toast.success('Conta excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir conta. Tente novamente.');
    }
  };

  if (!bill) return null;

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
