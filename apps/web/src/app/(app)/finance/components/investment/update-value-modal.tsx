'use client';

import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateInvestmentValue } from '../../hooks/use-investments';
import { formatCurrency, type Investment } from '../../types';

interface UpdateValueModalProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UpdateValueFormData {
  currentAmount: number;
}

/**
 * Modal for quickly updating investment current value
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function UpdateValueModal({
  investment,
  open,
  onOpenChange,
}: UpdateValueModalProps) {
  const { mutate: updateValue, isPending } = useUpdateInvestmentValue();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateValueFormData>();

  // Reset form when investment changes
  useEffect(() => {
    if (investment && open) {
      reset({
        currentAmount: parseFloat(investment.currentAmount) || 0,
      });
    }
  }, [investment, open, reset]);

  const onSubmit = (data: UpdateValueFormData) => {
    if (!investment) return;

    updateValue(
      { id: investment.id, data: { currentAmount: data.currentAmount } },
      {
        onSuccess: () => {
          toast.success('Valor atualizado com sucesso!');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Erro ao atualizar valor', {
            description: error.message,
          });
        },
      }
    );
  };

  if (!investment) return null;

  const currentValue = parseFloat(investment.currentAmount) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="update-value-modal">
        <DialogHeader>
          <DialogTitle>Atualizar Valor</DialogTitle>
          <DialogDescription>
            Atualize o valor atual de <strong>{investment.name}</strong>.
            Valor atual: {formatCurrency(currentValue)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentAmount">Novo Valor (R$)</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register('currentAmount', {
                required: 'Valor é obrigatório',
                valueAsNumber: true,
                min: { value: 0, message: 'Valor deve ser positivo' },
              })}
              data-testid="update-value-input"
            />
            {errors.currentAmount && (
              <p className="text-xs text-destructive">{errors.currentAmount.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-testid="update-value-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="update-value-submit"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
