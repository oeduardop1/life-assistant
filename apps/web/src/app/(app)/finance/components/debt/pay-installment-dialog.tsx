'use client';

import { Loader2, CheckCircle2 } from 'lucide-react';
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
import { usePayInstallment } from '../../hooks/use-debts';
import { formatCurrency, calculateDebtProgress, type Debt } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface PayInstallmentDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PayInstallmentDialog - Confirmation dialog for paying an installment
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function PayInstallmentDialog({
  debt,
  open,
  onOpenChange,
}: PayInstallmentDialogProps) {
  const payInstallment = usePayInstallment();

  const handlePay = async () => {
    if (!debt) return;

    try {
      await payInstallment.mutateAsync(debt.id);

      const isLastInstallment = debt.currentInstallment === debt.totalInstallments;
      if (isLastInstallment) {
        toast.success('Parabéns! Dívida quitada com sucesso! 🎉');
      } else {
        toast.success(`Parcela ${debt.currentInstallment} paga com sucesso`);
      }
      onOpenChange(false);
    } catch {
      toast.error('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  if (!debt || !debt.installmentAmount || !debt.totalInstallments) return null;

  const progress = calculateDebtProgress(debt);
  const isLastInstallment = debt.currentInstallment === debt.totalInstallments;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="pay-installment-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Pagar Parcela
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Confirmar pagamento da parcela{' '}
                <span className="font-medium text-foreground">
                  {debt.currentInstallment}/{debt.totalInstallments}
                </span>{' '}
                da dívida{' '}
                <span className="font-medium text-foreground">&ldquo;{debt.name}&rdquo;</span>?
              </p>

              {/* Payment Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor da Parcela:</span>
                  <span className="font-medium" data-testid="pay-installment-amount">
                    {formatCurrency(debt.installmentAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já Pago:</span>
                  <span className="text-green-600">
                    {formatCurrency(progress.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restante Após:</span>
                  <span className="text-orange-600">
                    {formatCurrency(progress.remainingAmount - debt.installmentAmount)}
                  </span>
                </div>
              </div>

              {isLastInstallment && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    🎉 Esta é a última parcela! A dívida será quitada após o pagamento.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={payInstallment.isPending}
            data-testid="pay-installment-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePay}
            disabled={payInstallment.isPending}
            className="bg-green-600 text-white hover:bg-green-700"
            data-testid="pay-installment-confirm"
          >
            {payInstallment.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirmar Pagamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
