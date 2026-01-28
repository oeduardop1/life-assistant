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
import { formatCurrency, type Income } from '../../types';
import { useUpdateIncome } from '../../hooks/use-incomes';

// =============================================================================
// Types
// =============================================================================

interface IncomeQuickRegisterProps {
  income: Income | null;
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
          Valor registrado!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * IncomeQuickRegister - Dialog for quickly registering received income value
 *
 * Features:
 * - Pre-filled with expected amount
 * - Simple single-field form
 * - Success animation on confirmation
 * - Keyboard support (Enter to submit)
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeQuickRegister({
  income,
  open,
  onOpenChange,
}: IncomeQuickRegisterProps) {
  const updateIncome = useUpdateIncome();
  const [value, setValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle dialog open state changes
  const handleOpenAutoFocus = useCallback(() => {
    if (income) {
      setValue(income.expectedAmount.toString());
      // Focus and select input after dialog opens
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  }, [income]);

  // Reset state when dialog closes
  const handleCloseAutoFocus = useCallback(() => {
    setShowSuccess(false);
    setValue('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!income) return;

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('Por favor, informe um valor válido');
      return;
    }

    try {
      await updateIncome.mutateAsync({
        id: income.id,
        data: {
          actualAmount: numericValue,
        },
      });

      // Show success animation
      setShowSuccess(true);

      // Close dialog after animation
      setTimeout(() => {
        onOpenChange(false);
        toast.success('Valor registrado com sucesso');
      }, 1000);
    } catch {
      toast.error('Erro ao registrar valor. Tente novamente.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!income) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[400px]"
        data-testid="income-quick-register"
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <div className="relative">
          <AnimatePresence>
            {showSuccess && <SuccessAnimation />}
          </AnimatePresence>

          <DialogHeader>
            <DialogTitle>Registrar Valor Recebido</DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{income.name}</span>
              <span>
                Previsto: {formatCurrency(income.expectedAmount)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Value Input */}
            <div className="space-y-2">
              <Label htmlFor="quick-register-value">Valor Recebido (R$)</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="quick-register-value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={updateIncome.isPending || showSuccess}
                  className={cn(
                    'text-lg font-semibold h-12 pr-24',
                    showSuccess && 'opacity-50'
                  )}
                  data-testid="income-quick-register-value"
                />
                {/* Same as expected hint */}
                {value === income.expectedAmount.toString() && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  >
                    = previsto
                  </motion.span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Pressione Enter para confirmar
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateIncome.isPending || showSuccess}
                data-testid="income-quick-register-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateIncome.isPending || showSuccess || !value}
                data-testid="income-quick-register-submit"
              >
                {updateIncome.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirmar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
