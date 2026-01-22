'use client';

import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { investmentTypeOptions, type InvestmentType } from '../../types';

export interface InvestmentFormData {
  name: string;
  type: InvestmentType;
  currentAmount: number;
  goalAmount?: number;
  monthlyContribution?: number;
  deadline?: string;
}

interface InvestmentFormProps {
  defaultValues?: Partial<InvestmentFormData>;
  onSubmit: (data: InvestmentFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Reusable form for creating and editing investments
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: InvestmentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvestmentFormData>({
    defaultValues: {
      name: '',
      type: 'emergency_fund',
      currentAmount: 0,
      goalAmount: undefined,
      monthlyContribution: undefined,
      deadline: undefined,
      ...defaultValues,
    },
  });

  const selectedType = watch('type');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="investment-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Investimento</Label>
        <Input
          id="name"
          placeholder="Ex: Reserva de Emergência, Aposentadoria..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="investment-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select
          value={selectedType}
          onValueChange={(value) => setValue('type', value as InvestmentType)}
        >
          <SelectTrigger data-testid="investment-form-type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {investmentTypeOptions.map((option) => (
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

      {/* Current Amount */}
      <div className="space-y-2">
        <Label htmlFor="currentAmount">Valor Atual (R$)</Label>
        <Input
          id="currentAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('currentAmount', {
            required: 'Valor atual é obrigatório',
            valueAsNumber: true,
            min: { value: 0, message: 'Valor deve ser positivo' },
          })}
          data-testid="investment-form-current-amount"
        />
        {errors.currentAmount && (
          <p className="text-xs text-destructive">{errors.currentAmount.message}</p>
        )}
      </div>

      {/* Goal Amount (optional) */}
      <div className="space-y-2">
        <Label htmlFor="goalAmount">Meta (R$) - Opcional</Label>
        <Input
          id="goalAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('goalAmount', {
            valueAsNumber: true,
            min: { value: 0, message: 'Meta deve ser positiva' },
          })}
          data-testid="investment-form-goal-amount"
        />
        <p className="text-xs text-muted-foreground">
          Defina uma meta para acompanhar seu progresso
        </p>
        {errors.goalAmount && (
          <p className="text-xs text-destructive">{errors.goalAmount.message}</p>
        )}
      </div>

      {/* Deadline (optional) */}
      <div className="space-y-2">
        <Label htmlFor="deadline">Prazo - Opcional</Label>
        <Input
          id="deadline"
          type="date"
          {...register('deadline')}
          data-testid="investment-form-deadline"
        />
        <p className="text-xs text-muted-foreground">
          Data limite para atingir a meta
        </p>
      </div>

      {/* Monthly Contribution (optional) */}
      <div className="space-y-2">
        <Label htmlFor="monthlyContribution">Aporte Mensal (R$) - Opcional</Label>
        <Input
          id="monthlyContribution"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('monthlyContribution', {
            valueAsNumber: true,
            min: { value: 0, message: 'Aporte deve ser positivo' },
          })}
          data-testid="investment-form-monthly-contribution"
        />
        <p className="text-xs text-muted-foreground">
          Valor planejado para investir mensalmente
        </p>
        {errors.monthlyContribution && (
          <p className="text-xs text-destructive">{errors.monthlyContribution.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="investment-form-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="investment-form-submit"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
