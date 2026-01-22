'use client';

import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNegotiateDebt } from '../../hooks/use-debts';
import { formatCurrency, type Debt } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface NegotiateFormData {
  totalInstallments: number;
  installmentAmount: number;
  dueDay: number;
}

// =============================================================================
// Props
// =============================================================================

interface NegotiateDebtModalProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * NegotiateDebtModal - Modal for negotiating a pending debt
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function NegotiateDebtModal({
  debt,
  open,
  onOpenChange,
}: NegotiateDebtModalProps) {
  const negotiateDebt = useNegotiateDebt();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NegotiateFormData>({
    defaultValues: {
      totalInstallments: 12,
      installmentAmount: debt ? Math.ceil(debt.totalAmount / 12) : 0,
      dueDay: 10,
    },
  });

  const totalInstallments = watch('totalInstallments');
  const installmentAmount = watch('installmentAmount');

  const onSubmit = async (data: NegotiateFormData) => {
    if (!debt) return;

    try {
      await negotiateDebt.mutateAsync({
        id: debt.id,
        data: {
          totalInstallments: data.totalInstallments,
          installmentAmount: data.installmentAmount,
          dueDay: data.dueDay,
        },
      });

      toast.success('Dívida negociada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao negociar dívida. Tente novamente.');
    }
  };

  if (!debt) return null;

  const totalWithInstallments = totalInstallments && installmentAmount
    ? totalInstallments * installmentAmount
    : 0;
  const difference = totalWithInstallments - debt.totalAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" data-testid="negotiate-debt-modal">
        <DialogHeader>
          <DialogTitle>Negociar Dívida</DialogTitle>
          <DialogDescription>
            Defina as condições de parcelamento para a dívida{' '}
            <span className="font-medium">&ldquo;{debt.name}&rdquo;</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Debt Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground">Valor Total da Dívida</p>
          <p className="text-xl font-semibold" data-testid="negotiate-debt-total">
            {formatCurrency(debt.totalAmount)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Total Installments */}
          <div className="space-y-2">
            <Label htmlFor="totalInstallments">Número de Parcelas</Label>
            <Input
              id="totalInstallments"
              type="number"
              min="1"
              {...register('totalInstallments', {
                required: 'Número de parcelas é obrigatório',
                valueAsNumber: true,
                min: { value: 1, message: 'Deve ter pelo menos 1 parcela' },
              })}
              data-testid="negotiate-form-total-installments"
            />
            {errors.totalInstallments && (
              <p className="text-xs text-destructive">{errors.totalInstallments.message}</p>
            )}
          </div>

          {/* Installment Amount */}
          <div className="space-y-2">
            <Label htmlFor="installmentAmount">Valor da Parcela (R$)</Label>
            <Input
              id="installmentAmount"
              type="number"
              step="0.01"
              min="0"
              {...register('installmentAmount', {
                required: 'Valor da parcela é obrigatório',
                valueAsNumber: true,
                min: { value: 0.01, message: 'Valor deve ser maior que zero' },
              })}
              data-testid="negotiate-form-installment-amount"
            />
            {errors.installmentAmount && (
              <p className="text-xs text-destructive">{errors.installmentAmount.message}</p>
            )}
          </div>

          {/* Due Day */}
          <div className="space-y-2">
            <Label htmlFor="dueDay">Dia de Vencimento</Label>
            <Input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              {...register('dueDay', {
                required: 'Dia de vencimento é obrigatório',
                valueAsNumber: true,
                min: { value: 1, message: 'Dia deve ser entre 1 e 31' },
                max: { value: 31, message: 'Dia deve ser entre 1 e 31' },
              })}
              data-testid="negotiate-form-due-day"
            />
            {errors.dueDay && (
              <p className="text-xs text-destructive">{errors.dueDay.message}</p>
            )}
          </div>

          {/* Calculated Total */}
          {totalInstallments > 0 && installmentAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Parcelado:</span>
                <span className="font-medium">{formatCurrency(totalWithInstallments)}</span>
              </div>
              {difference !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {difference > 0 ? 'Juros/Taxas:' : 'Desconto:'}
                  </span>
                  <span className={difference > 0 ? 'text-red-600' : 'text-green-600'}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={negotiateDebt.isPending}
              data-testid="negotiate-form-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={negotiateDebt.isPending}
              data-testid="negotiate-form-submit"
            >
              {negotiateDebt.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmar Negociação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
