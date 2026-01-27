'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Minus, Plus } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
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

interface DialogContentProps {
  debt: Debt;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Internal Dialog Content Component
// =============================================================================

/**
 * Separate component for dialog content to reset state when remounted via key
 */
function DialogContent({
  debt,
  onOpenChange,
}: DialogContentProps) {
  const payInstallment = usePayInstallment();
  const [quantity, setQuantity] = useState(1);

  const handlePay = async () => {
    try {
      await payInstallment.mutateAsync({ id: debt.id, quantity });

      const newInstallment = debt.currentInstallment + quantity;
      const willPayOff = newInstallment > debt.totalInstallments!;
      if (willPayOff) {
        toast.success('Parabéns! Dívida quitada com sucesso! 🎉');
      } else if (quantity === 1) {
        toast.success(`Parcela ${String(debt.currentInstallment)} paga com sucesso`);
      } else {
        toast.success(`${String(quantity)} parcelas pagas com sucesso`);
      }
      onOpenChange(false);
    } catch {
      toast.error('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  const progress = calculateDebtProgress(debt);
  const remainingInstallments = debt.totalInstallments! - (debt.currentInstallment - 1);
  const maxQuantity = Math.min(remainingInstallments, 12); // Limit to 12 at once
  const isLastInstallment = quantity >= remainingInstallments;
  const totalPayment = quantity * debt.installmentAmount!;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Pagar Parcela{quantity > 1 ? 's' : ''}
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Confirmar pagamento{' '}
              {quantity === 1 ? (
                <>
                  da parcela{' '}
                  <span className="font-medium text-foreground">
                    {debt.currentInstallment}/{debt.totalInstallments}
                  </span>
                </>
              ) : (
                <>
                  de{' '}
                  <span className="font-medium text-foreground">
                    {quantity} parcelas
                  </span>{' '}
                  ({debt.currentInstallment} a {debt.currentInstallment + quantity - 1})
                </>
              )}{' '}
              da dívida{' '}
              <span className="font-medium text-foreground">&ldquo;{debt.name}&rdquo;</span>?
            </p>

            {/* Quantity Selector */}
            {remainingInstallments > 1 && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <span className="text-sm font-medium">Quantidade de parcelas:</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || payInstallment.isPending}
                    data-testid="pay-installment-decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span
                    className="w-8 text-center font-medium"
                    data-testid="pay-installment-quantity"
                  >
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    disabled={quantity >= maxQuantity || payInstallment.isPending}
                    data-testid="pay-installment-increase"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor por Parcela:</span>
                <span className="font-medium" data-testid="pay-installment-amount">
                  {formatCurrency(debt.installmentAmount!)}
                </span>
              </div>
              {quantity > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total a Pagar:</span>
                  <span className="font-medium text-foreground" data-testid="pay-installment-total">
                    {formatCurrency(totalPayment)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Já Pago:</span>
                <span className="text-green-600">
                  {formatCurrency(progress.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Restante Após:</span>
                <span className="text-orange-600">
                  {formatCurrency(progress.remainingAmount - totalPayment)}
                </span>
              </div>
            </div>

            {isLastInstallment && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  🎉 {quantity === remainingInstallments ? 'Estas são as últimas parcelas!' : 'Esta é a última parcela!'} A dívida será quitada após o pagamento.
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
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * PayInstallmentDialog - Confirmation dialog for paying installment(s)
 * Supports paying multiple installments at once.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function PayInstallmentDialog({
  debt,
  open,
  onOpenChange,
}: PayInstallmentDialogProps) {
  if (!debt || !debt.installmentAmount || !debt.totalInstallments) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="pay-installment-dialog">
        {/* Key prop resets DialogContent state when debt changes */}
        <DialogContent key={debt.id} debt={debt} onOpenChange={onOpenChange} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
