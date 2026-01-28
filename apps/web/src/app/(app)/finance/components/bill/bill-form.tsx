'use client';

import { useForm, useWatch } from 'react-hook-form';
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
  billCategoryOptions,
  type BillCategory,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface BillFormData {
  name: string;
  category: BillCategory;
  amount: number;
  dueDay: number;
  isRecurring: boolean;
}

// =============================================================================
// Props
// =============================================================================

interface BillFormProps {
  defaultValues?: Partial<BillFormData>;
  onSubmit: (data: BillFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BillForm - Shared form for creating/editing bills
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: BillFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<BillFormData>({
    defaultValues: {
      name: '',
      category: 'other',
      amount: 0,
      dueDay: 1,
      isRecurring: true,
      ...defaultValues,
    },
  });

  const categoryValue = useWatch({ control, name: 'category' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="bill-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Ex: Aluguel, Netflix..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="bill-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={categoryValue}
          onValueChange={(value) => setValue('category', value as BillCategory)}
        >
          <SelectTrigger data-testid="bill-form-category">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {billCategoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Valor (R$)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('amount', {
            required: 'Valor é obrigatório',
            valueAsNumber: true,
            min: { value: 0.01, message: 'Valor deve ser maior que zero' },
          })}
          data-testid="bill-form-amount"
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
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
            required: 'Dia é obrigatório',
            valueAsNumber: true,
            min: { value: 1, message: 'Dia deve ser entre 1 e 31' },
            max: { value: 31, message: 'Dia deve ser entre 1 e 31' },
          })}
          data-testid="bill-form-due-day"
        />
        <p className="text-xs text-muted-foreground">
          Se o mês não tiver esse dia, será usado o último dia do mês
        </p>
        {errors.dueDay && (
          <p className="text-xs text-destructive">{errors.dueDay.message}</p>
        )}
      </div>

      {/* Is Recurring */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="isRecurring">Conta Recorrente</Label>
          <p className="text-xs text-muted-foreground">
            Será copiada automaticamente para os próximos meses
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue('isRecurring', checked)}
          data-testid="bill-form-is-recurring"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="bill-form-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="bill-form-submit"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
