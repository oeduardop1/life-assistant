'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Minus, Plus, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePayInstallment } from '../../hooks/use-debts';
import { formatCurrency, calculateDebtProgress, type Debt } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface PayInstallmentDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Quantity Selector Component
// =============================================================================

interface QuantitySelectorProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  installmentAmount: number;
}

function QuantitySelector({
  value,
  min,
  max,
  onChange,
  disabled,
  installmentAmount,
}: QuantitySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-sm text-muted-foreground">Quantidade de parcelas</p>

      <div className="flex items-center gap-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min || disabled}
        >
          <Minus className="h-5 w-5" />
        </Button>

        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <span className="text-5xl font-bold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground mt-1">
            {value === 1 ? 'parcela' : 'parcelas'}
          </span>
        </motion.div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max || disabled}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <motion.div
        key={`total-${value}`}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <p className="text-2xl font-semibold tabular-nums" data-testid="pay-installment-amount">
          {formatCurrency(value * installmentAmount)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {value} × {formatCurrency(installmentAmount)}
        </p>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Progress Preview Component
// =============================================================================

interface ProgressPreviewProps {
  currentPaid: number;
  total: number;
  payingNow: number;
  paidAmount: number;
  remainingAmount: number;
  payingAmount: number;
}

function ProgressPreview({
  currentPaid,
  total,
  payingNow,
  paidAmount,
  remainingAmount,
  payingAmount,
}: ProgressPreviewProps) {
  const afterPaid = currentPaid + payingNow;
  const currentPercent = Math.round((currentPaid / total) * 100);
  const afterPercent = Math.round((afterPaid / total) * 100);

  return (
    <div className="space-y-4 py-4 px-1">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>
            {currentPercent}% → {afterPercent}%
          </span>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          {/* Current Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500/50 rounded-full"
            style={{ width: `${currentPercent}%` }}
          />
          {/* After Payment Progress */}
          <motion.div
            initial={{ width: `${currentPercent}%` }}
            animate={{ width: `${afterPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {currentPaid}/{total} parcelas
          </span>
          <span className="text-emerald-600 dark:text-emerald-500 font-medium">
            → {afterPaid}/{total}
          </span>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Já Pago</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
            {formatCurrency(paidAmount)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-foreground/5 border-2 border-foreground/10">
          <p className="text-xs text-muted-foreground mb-1">Pagando</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(payingAmount)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Restante</p>
          <p className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-500">
            {formatCurrency(remainingAmount - payingAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Last Installment Alert
// =============================================================================

interface LastInstallmentAlertProps {
  isLast: boolean;
  quantity: number;
  remaining: number;
}

function LastInstallmentAlert({ isLast, quantity, remaining }: LastInstallmentAlertProps) {
  if (!isLast) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
    >
      <PartyPopper className="h-6 w-6 text-emerald-600 dark:text-emerald-500 shrink-0" />
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {quantity === remaining
            ? 'Estas são as últimas parcelas!'
            : 'Esta é a última parcela!'}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
          A dívida será quitada após o pagamento
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Dialog Content
// =============================================================================

interface DialogContentInnerProps {
  debt: Debt;
  onOpenChange: (open: boolean) => void;
}

function DialogContentInner({ debt, onOpenChange }: DialogContentInnerProps) {
  const payInstallment = usePayInstallment();
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const confettiRef = useRef(false);

  const progress = calculateDebtProgress(debt);
  const remainingInstallments = debt.totalInstallments! - (debt.currentInstallment - 1);
  const maxQuantity = Math.min(remainingInstallments, 12);
  const isLastInstallment = quantity >= remainingInstallments;
  const totalPayment = quantity * debt.installmentAmount!;

  const handlePay = async () => {
    try {
      await payInstallment.mutateAsync({ id: debt.id, quantity });

      const newInstallment = debt.currentInstallment + quantity;
      const willPayOff = newInstallment > debt.totalInstallments!;

      if (willPayOff && !confettiRef.current) {
        confettiRef.current = true;
        setShowSuccess(true);

        // Fire confetti
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#10b981', '#34d399', '#6ee7b7'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#10b981', '#34d399', '#6ee7b7'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();

        setTimeout(() => {
          toast.success('Parabéns! Dívida quitada com sucesso! 🎉');
          onOpenChange(false);
        }, 2000);
      } else {
        const message =
          quantity === 1
            ? `Parcela ${debt.currentInstallment} paga com sucesso`
            : `${quantity} parcelas pagas com sucesso`;
        toast.success(message);
        onOpenChange(false);
      }
    } catch {
      toast.error('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  // Reset confetti ref when debt changes
  useEffect(() => {
    confettiRef.current = false;
  }, [debt.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <h2 className="text-lg font-semibold">Pagar Parcela</h2>
        <p className="text-sm text-muted-foreground">
          {debt.name}
          {debt.creditor && ` · ${debt.creditor}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Parcela {debt.currentInstallment} de {debt.totalInstallments}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="p-4 rounded-full bg-emerald-500/10 mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </motion.div>
            <p className="text-lg font-semibold">Dívida Quitada!</p>
            <p className="text-sm text-muted-foreground">Parabéns pelo pagamento!</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Quantity Selector */}
            {remainingInstallments > 1 && (
              <QuantitySelector
                value={quantity}
                min={1}
                max={maxQuantity}
                onChange={setQuantity}
                disabled={payInstallment.isPending}
                installmentAmount={debt.installmentAmount!}
              />
            )}

            {/* Single installment display */}
            {remainingInstallments === 1 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">Última parcela</p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatCurrency(debt.installmentAmount!)}
                </p>
              </div>
            )}

            {/* Progress Preview */}
            <ProgressPreview
              currentPaid={progress.paidInstallments}
              total={debt.totalInstallments!}
              payingNow={quantity}
              paidAmount={progress.paidAmount}
              remainingAmount={progress.remainingAmount}
              payingAmount={totalPayment}
            />

            {/* Last Installment Alert */}
            <LastInstallmentAlert
              isLast={isLastInstallment}
              quantity={quantity}
              remaining={remainingInstallments}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!showSuccess && (
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={payInstallment.isPending} data-testid="pay-installment-cancel">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePay}
            disabled={payInstallment.isPending}
            className={cn(
              'gap-2',
              isLastInstallment
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            )}
            data-testid="pay-installment-confirm"
          >
            {payInstallment.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isLastInstallment ? 'Quitar Dívida' : 'Confirmar Pagamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * PayInstallmentDialog - Enhanced payment dialog with visual quantity selector
 *
 * Features:
 * - Large, visual quantity selector
 * - Real-time progress preview
 * - Confetti celebration on debt payoff
 * - Progress bar animation
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
      <AlertDialogContent
        className="sm:max-w-[420px]"
        data-testid="pay-installment-dialog"
      >
        <DialogContentInner key={debt.id} debt={debt} onOpenChange={onOpenChange} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
