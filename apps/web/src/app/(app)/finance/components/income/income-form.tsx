'use client';

import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  incomeTypeOptions,
  incomeFrequencyOptions,
  type IncomeType,
  type IncomeFrequency,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface IncomeFormData {
  name: string;
  type: IncomeType;
  frequency: IncomeFrequency;
  expectedAmount: number;
  actualAmount?: number | null;
  isRecurring: boolean;
}

// =============================================================================
// Props
// =============================================================================

interface IncomeFormProps {
  defaultValues?: Partial<IncomeFormData>;
  onSubmit: (data: IncomeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * IncomeForm - Shared form for creating/editing incomes
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: IncomeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IncomeFormData>({
    defaultValues: {
      name: '',
      type: 'salary',
      frequency: 'monthly',
      expectedAmount: 0,
      actualAmount: null,
      isRecurring: true,
      ...defaultValues,
    },
  });

  const typeValue = watch('type');
  const frequencyValue = watch('frequency');
  const isRecurring = watch('isRecurring');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="income-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Ex: Salário, Freelance..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="income-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select
          value={typeValue}
          onValueChange={(value) => setValue('type', value as IncomeType)}
        >
          <SelectTrigger data-testid="income-form-type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {incomeTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequência</Label>
        <Select
          value={frequencyValue}
          onValueChange={(value) => setValue('frequency', value as IncomeFrequency)}
        >
          <SelectTrigger data-testid="income-form-frequency">
            <SelectValue placeholder="Selecione a frequência" />
          </SelectTrigger>
          <SelectContent>
            {incomeFrequencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.frequency && (
          <p className="text-xs text-destructive">{errors.frequency.message}</p>
        )}
      </div>

      {/* Expected Amount */}
      <div className="space-y-2">
        <Label htmlFor="expectedAmount">Valor Previsto (R$)</Label>
        <Input
          id="expectedAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('expectedAmount', {
            required: 'Valor é obrigatório',
            valueAsNumber: true,
            min: { value: 0.01, message: 'Valor deve ser maior que zero' },
          })}
          data-testid="income-form-expected-amount"
        />
        {errors.expectedAmount && (
          <p className="text-xs text-destructive">{errors.expectedAmount.message}</p>
        )}
      </div>

      {/* Actual Amount (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="actualAmount">Valor Real (R$) - Opcional</Label>
        <Input
          id="actualAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('actualAmount', {
            valueAsNumber: true,
            min: { value: 0, message: 'Valor não pode ser negativo' },
          })}
          data-testid="income-form-actual-amount"
        />
        <p className="text-xs text-muted-foreground">
          Deixe em branco se ainda não recebeu
        </p>
        {errors.actualAmount && (
          <p className="text-xs text-destructive">{errors.actualAmount.message}</p>
        )}
      </div>

      {/* Is Recurring */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="isRecurring">Renda Recorrente</Label>
          <p className="text-xs text-muted-foreground">
            Será copiada automaticamente para os próximos meses
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue('isRecurring', checked)}
          data-testid="income-form-is-recurring"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="income-form-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="income-form-submit"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
