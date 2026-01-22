'use client';

import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// =============================================================================
// Types
// =============================================================================

export interface DebtFormData {
  name: string;
  creditor: string;
  totalAmount: number;
  isNegotiated: boolean;
  totalInstallments?: number;
  installmentAmount?: number;
  dueDay?: number;
  notes: string;
}

// =============================================================================
// Props
// =============================================================================

interface DebtFormProps {
  defaultValues?: Partial<DebtFormData>;
  onSubmit: (data: DebtFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** Hide isNegotiated toggle (used in negotiate modal) */
  hideNegotiatedToggle?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DebtForm - Shared form for creating/editing debts
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  hideNegotiatedToggle,
}: DebtFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DebtFormData>({
    defaultValues: {
      name: '',
      creditor: '',
      totalAmount: 0,
      isNegotiated: true,
      totalInstallments: undefined,
      installmentAmount: undefined,
      dueDay: undefined,
      notes: '',
      ...defaultValues,
    },
  });

  const isNegotiated = watch('isNegotiated');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="debt-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Dívida</Label>
        <Input
          id="name"
          placeholder="Ex: Financiamento Carro, Empréstimo..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="debt-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Creditor */}
      <div className="space-y-2">
        <Label htmlFor="creditor">Credor (Opcional)</Label>
        <Input
          id="creditor"
          placeholder="Ex: Banco XYZ, Financeira ABC..."
          {...register('creditor')}
          data-testid="debt-form-creditor"
        />
      </div>

      {/* Total Amount */}
      <div className="space-y-2">
        <Label htmlFor="totalAmount">Valor Total (R$)</Label>
        <Input
          id="totalAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('totalAmount', {
            required: 'Valor é obrigatório',
            valueAsNumber: true,
            min: { value: 0.01, message: 'Valor deve ser maior que zero' },
          })}
          data-testid="debt-form-total-amount"
        />
        {errors.totalAmount && (
          <p className="text-xs text-destructive">{errors.totalAmount.message}</p>
        )}
      </div>

      {/* Is Negotiated Toggle */}
      {!hideNegotiatedToggle && (
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="isNegotiated">Dívida Negociada</Label>
            <p className="text-xs text-muted-foreground">
              Já possui acordo de parcelamento definido
            </p>
          </div>
          <Switch
            id="isNegotiated"
            checked={isNegotiated}
            onCheckedChange={(checked) => setValue('isNegotiated', checked)}
            data-testid="debt-form-is-negotiated"
          />
        </div>
      )}

      {/* Negotiated Fields (conditional) */}
      {isNegotiated && (
        <div className="space-y-4 pt-2 border-t">
          <p className="text-sm font-medium text-muted-foreground">
            Detalhes do Parcelamento
          </p>

          {/* Total Installments */}
          <div className="space-y-2">
            <Label htmlFor="totalInstallments">Número de Parcelas</Label>
            <Input
              id="totalInstallments"
              type="number"
              min="1"
              placeholder="Ex: 12, 24, 48..."
              {...register('totalInstallments', {
                required: isNegotiated ? 'Número de parcelas é obrigatório' : false,
                valueAsNumber: true,
                min: { value: 1, message: 'Deve ter pelo menos 1 parcela' },
              })}
              data-testid="debt-form-total-installments"
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
              placeholder="0,00"
              {...register('installmentAmount', {
                required: isNegotiated ? 'Valor da parcela é obrigatório' : false,
                valueAsNumber: true,
                min: { value: 0.01, message: 'Valor deve ser maior que zero' },
              })}
              data-testid="debt-form-installment-amount"
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
              placeholder="1-31"
              {...register('dueDay', {
                required: isNegotiated ? 'Dia de vencimento é obrigatório' : false,
                valueAsNumber: true,
                min: { value: 1, message: 'Dia deve ser entre 1 e 31' },
                max: { value: 31, message: 'Dia deve ser entre 1 e 31' },
              })}
              data-testid="debt-form-due-day"
            />
            <p className="text-xs text-muted-foreground">
              Se o mês não tiver esse dia, será usado o último dia do mês
            </p>
            {errors.dueDay && (
              <p className="text-xs text-destructive">{errors.dueDay.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (Opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Informações adicionais sobre a dívida..."
          rows={3}
          {...register('notes')}
          data-testid="debt-form-notes"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="debt-form-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="debt-form-submit"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
