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
  expenseCategoryOptions,
  type ExpenseCategory,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface ExpenseFormData {
  name: string;
  category: ExpenseCategory;
  expectedAmount: number;
  actualAmount: number;
  isRecurring: boolean;
}

// =============================================================================
// Props
// =============================================================================

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseForm - Shared form for creating/editing variable expenses
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: {
      name: '',
      category: 'other',
      expectedAmount: 0,
      actualAmount: 0,
      isRecurring: false,
      ...defaultValues,
    },
  });

  const categoryValue = watch('category');
  const isRecurring = watch('isRecurring');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="expense-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Ex: Supermercado, Uber..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="expense-form-name"
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
          onValueChange={(value) => setValue('category', value as ExpenseCategory)}
        >
          <SelectTrigger data-testid="expense-form-category">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {expenseCategoryOptions.map((option) => (
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
            required: 'Valor previsto é obrigatório',
            valueAsNumber: true,
            min: { value: 0, message: 'Valor deve ser maior ou igual a zero' },
          })}
          data-testid="expense-form-expected-amount"
        />
        {errors.expectedAmount && (
          <p className="text-xs text-destructive">{errors.expectedAmount.message}</p>
        )}
      </div>

      {/* Actual Amount */}
      <div className="space-y-2">
        <Label htmlFor="actualAmount">Valor Real (R$)</Label>
        <Input
          id="actualAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          {...register('actualAmount', {
            valueAsNumber: true,
            min: { value: 0, message: 'Valor deve ser maior ou igual a zero' },
          })}
          data-testid="expense-form-actual-amount"
        />
        <p className="text-xs text-muted-foreground">
          Deixe em 0 se ainda não souber o valor final
        </p>
        {errors.actualAmount && (
          <p className="text-xs text-destructive">{errors.actualAmount.message}</p>
        )}
      </div>

      {/* Is Recurring */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="isRecurring">Despesa Recorrente</Label>
          <p className="text-xs text-muted-foreground">
            Despesas que se repetem todo mês (ex: mercado, combustível)
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue('isRecurring', checked)}
          data-testid="expense-form-is-recurring"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="expense-form-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="expense-form-submit"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
