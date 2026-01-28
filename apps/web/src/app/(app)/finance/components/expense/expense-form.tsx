'use client';

import { useForm } from 'react-hook-form';
import { Loader2, Info } from 'lucide-react';
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
import { cn } from '@/lib/utils';
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
  mode?: 'create' | 'edit';
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseForm - Shared form for creating/editing variable expenses
 *
 * Features:
 * - Responsive layout with side-by-side value fields on desktop
 * - Better visual organization
 * - Improved recurring toggle description
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = 'create',
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
  const expectedAmount = watch('expectedAmount');
  const actualAmount = watch('actualAmount');

  // Calculate preview
  const usagePercent = expectedAmount > 0
    ? Math.min((actualAmount / expectedAmount) * 100, 150)
    : 0;
  const isOverBudget = actualAmount > expectedAmount && expectedAmount > 0;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      data-testid="expense-form"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Despesa *</Label>
        <Input
          id="name"
          placeholder="Ex: Supermercado, Uber, Academia..."
          {...register('name', { required: 'Nome é obrigatório' })}
          data-testid="expense-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria *</Label>
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

      {/* Value Fields - Side by side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expected Amount */}
        <div className="space-y-2">
          <Label htmlFor="expectedAmount">Valor Previsto (R$) *</Label>
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
            className={cn(
              isOverBudget && 'border-destructive focus-visible:ring-destructive'
            )}
            data-testid="expense-form-actual-amount"
          />
          {errors.actualAmount && (
            <p className="text-xs text-destructive">{errors.actualAmount.message}</p>
          )}
        </div>
      </div>

      {/* Usage Preview (only show if both values are > 0) */}
      {expectedAmount > 0 && actualAmount > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uso do orçamento</span>
            <span className={cn(
              'font-medium tabular-nums',
              isOverBudget && 'text-destructive',
              !isOverBudget && usagePercent >= 80 && 'text-amber-600 dark:text-amber-500',
              !isOverBudget && usagePercent < 80 && 'text-emerald-600 dark:text-emerald-500'
            )}>
              {usagePercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isOverBudget && 'bg-destructive',
                !isOverBudget && usagePercent >= 80 && 'bg-amber-500',
                !isOverBudget && usagePercent < 80 && 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Hint for actual amount */}
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        Deixe o valor real em 0 se ainda não souber o valor final. Você pode atualizar depois.
      </p>

      {/* Is Recurring */}
      <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="space-y-1">
          <Label htmlFor="isRecurring" className="text-sm font-medium">
            Despesa Recorrente
          </Label>
          <p className="text-xs text-muted-foreground">
            {mode === 'create'
              ? 'Ativar para criar automaticamente nos próximos meses'
              : 'Esta despesa se repete todo mês'}
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
      <div className="flex justify-end gap-2 pt-4 border-t">
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
          {mode === 'create' ? 'Criar Despesa' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}
