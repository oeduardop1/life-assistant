'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteInvestment } from '../../hooks/use-investments';
import { formatCurrency, type Investment } from '../../types';

interface DeleteInvestmentDialogProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for deleting an investment
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DeleteInvestmentDialog({
  investment,
  open,
  onOpenChange,
}: DeleteInvestmentDialogProps) {
  const { mutate: deleteInvestment, isPending } = useDeleteInvestment();

  if (!investment) return null;

  const handleConfirm = () => {
    deleteInvestment(investment.id, {
      onSuccess: () => {
        toast.success('Investimento excluído com sucesso!');
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error('Erro ao excluir investimento', {
          description: error.message,
        });
      },
    });
  };

  const currentValue = parseFloat(investment.currentAmount) || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-investment-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Investimento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o investimento{' '}
            <strong>{investment.name}</strong> com valor de{' '}
            <strong>{formatCurrency(currentValue)}</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="delete-investment-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="delete-investment-confirm"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
