'use client';

import { useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  expenseCategoryLabels,
  type Expense,
} from '../../types';
import { useUpdateExpense } from '../../hooks/use-expenses';
import { AnimatedProgressBar } from './expense-animations';

// =============================================================================
// Types
// =============================================================================

interface ExpenseQuickUpdateProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Success Animation Component
// =============================================================================

function SuccessAnimation() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-background/95 rounded-lg z-10"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-medium text-emerald-600 dark:text-emerald-500"
        >
          Valor atualizado!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ExpenseQuickUpdate - Dialog for quickly updating the actual expense value
 *
 * Features:
 * - Pre-filled with current actual amount
 * - Simple single-field form
 * - Visual preview of budget impact
 * - Success animation on confirmation
 * - Keyboard support (Enter to submit)
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseQuickUpdate({
  expense,
  open,
  onOpenChange,
}: ExpenseQuickUpdateProps) {
  const updateExpense = useUpdateExpense();
  const [value, setValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle dialog open state changes
  const handleOpenAutoFocus = useCallback(() => {
    if (expense) {
      setValue(expense.actualAmount.toString());
      // Focus and select input after dialog opens
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  }, [expense]);

  // Reset state when dialog closes
  const handleCloseAutoFocus = useCallback(() => {
    setShowSuccess(false);
    setValue('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expense) return;

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('Por favor, informe um valor válido');
      return;
    }

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        data: {
          actualAmount: numericValue,
        },
        scope: 'this',
      });

      // Show success animation
      setShowSuccess(true);

      // Close dialog after animation
      setTimeout(() => {
        onOpenChange(false);
        toast.success('Valor atualizado com sucesso');
      }, 1000);
    } catch {
      toast.error('Erro ao atualizar valor. Tente novamente.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!expense) return null;

  // Calculate preview values
  const numericValue = parseFloat(value) || 0;
  const expectedAmount = typeof expense.expectedAmount === 'string'
    ? parseFloat(expense.expectedAmount)
    : expense.expectedAmount;
  const usagePercent = expectedAmount > 0
    ? Math.min((numericValue / expectedAmount) * 100, 150)
    : 0;
  const isOverBudget = numericValue > expectedAmount && expectedAmount > 0;
  const variance = numericValue - expectedAmount;

  // Determine progress bar color
  const progressColor: 'success' | 'warning' | 'danger' =
    usagePercent > 100 ? 'danger' :
    usagePercent >= 80 ? 'warning' : 'success';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[400px]"
        data-testid="expense-quick-update"
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <div className="relative">
          <AnimatePresence>
            {showSuccess && <SuccessAnimation />}
          </AnimatePresence>

          <DialogHeader>
            <DialogTitle>Atualizar Despesa</DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{expense.name}</span>
              <span className="text-xs">
                {expenseCategoryLabels[expense.category]} • Orçamento: {formatCurrency(expectedAmount)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Value Input */}
            <div className="space-y-2">
              <Label htmlFor="quick-update-value">Valor Real (R$)</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="quick-update-value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={updateExpense.isPending || showSuccess}
                  className={cn(
                    'text-lg font-semibold h-12 pr-24',
                    showSuccess && 'opacity-50',
                    isOverBudget && 'border-destructive focus-visible:ring-destructive'
                  )}
                  data-testid="expense-quick-update-value"
                />
                {/* Same as expected hint */}
                {numericValue === expectedAmount && expectedAmount > 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  >
                    = orçamento
                  </motion.span>
                )}
              </div>
            </div>

            {/* Budget Impact Preview */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uso do orçamento</span>
                <span className={cn(
                  'font-medium',
                  isOverBudget && 'text-destructive',
                  !isOverBudget && usagePercent >= 80 && 'text-amber-600 dark:text-amber-500',
                  !isOverBudget && usagePercent < 80 && 'text-emerald-600 dark:text-emerald-500'
                )}>
                  {usagePercent.toFixed(0)}%
                </span>
              </div>
              <AnimatedProgressBar
                value={Math.min(usagePercent, 100)}
                max={100}
                size="md"
                color={progressColor}
              />
              {isOverBudget && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive font-medium"
                >
                  +{formatCurrency(variance)} acima do orçamento
                </motion.p>
              )}
              {!isOverBudget && variance < 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-emerald-600 dark:text-emerald-500 font-medium"
                >
                  {formatCurrency(Math.abs(variance))} de economia
                </motion.p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Pressione Enter para confirmar
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateExpense.isPending || showSuccess}
                data-testid="expense-quick-update-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateExpense.isPending || showSuccess || !value}
                data-testid="expense-quick-update-submit"
              >
                {updateExpense.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
