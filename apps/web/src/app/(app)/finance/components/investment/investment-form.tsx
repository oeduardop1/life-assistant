'use client';

import { useForm } from 'react-hook-form';
import { Loader2, HelpCircle } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
 * Investment type descriptions for contextual help
 */
const investmentTypeDescriptions: Record<InvestmentType, string> = {
  emergency_fund: 'Dinheiro para imprevistos. Recomenda-se ter de 3 a 6 meses de despesas.',
  retirement: 'Investimentos de longo prazo para sua aposentadoria.',
  short_term: 'Metas para os proximos 1-2 anos, como viagens ou compras.',
  long_term: 'Objetivos para 3+ anos, como compra de imovel.',
  education: 'Reserva para cursos, especializacoes ou estudos.',
  custom: 'Categoria personalizada para outros objetivos.',
};

/**
 * Reusable form for creating and editing investments
 * Enhanced with tooltips and better currency input styling
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
    <TooltipProvider delayDuration={300}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        data-testid="investment-form"
      >
        {/* Name */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="name">Nome do Investimento</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Um nome descritivo para identificar este investimento
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="name"
            placeholder="Ex: Reserva de Emergencia, Aposentadoria..."
            {...register('name', { required: 'Nome e obrigatorio' })}
            data-testid="investment-form-name"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Categoria do investimento para melhor organizacao
              </TooltipContent>
            </Tooltip>
          </div>
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
          {/* Type description */}
          <p className="text-xs text-muted-foreground">
            {investmentTypeDescriptions[selectedType]}
          </p>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        {/* Current Amount */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="currentAmount">Valor Atual</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Quanto voce ja tem investido nesta aplicacao
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
              R$
            </span>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="pl-10 font-mono"
              {...register('currentAmount', {
                required: 'Valor atual e obrigatorio',
                valueAsNumber: true,
                min: { value: 0, message: 'Valor deve ser positivo' },
              })}
              data-testid="investment-form-current-amount"
            />
          </div>
          {errors.currentAmount && (
            <p className="text-xs text-destructive">{errors.currentAmount.message}</p>
          )}
        </div>

        {/* Goal Amount (optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="goalAmount">Meta (opcional)</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Defina o valor que deseja alcancar com este investimento
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
              R$
            </span>
            <Input
              id="goalAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="pl-10 font-mono"
              {...register('goalAmount', {
                valueAsNumber: true,
                min: { value: 0, message: 'Meta deve ser positiva' },
              })}
              data-testid="investment-form-goal-amount"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Com uma meta definida, voce podera acompanhar seu progresso
          </p>
          {errors.goalAmount && (
            <p className="text-xs text-destructive">{errors.goalAmount.message}</p>
          )}
        </div>

        {/* Deadline (optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="deadline">Prazo (opcional)</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Data limite para atingir sua meta
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="deadline"
            type="date"
            {...register('deadline')}
            data-testid="investment-form-deadline"
          />
          <p className="text-xs text-muted-foreground">
            Util para investimentos com objetivo de data especifica
          </p>
        </div>

        {/* Monthly Contribution (optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="monthlyContribution">Aporte Mensal (opcional)</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                Valor que voce planeja investir todo mes. Usado para calcular quanto tempo falta para a meta.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
              R$
            </span>
            <Input
              id="monthlyContribution"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="pl-10 font-mono"
              {...register('monthlyContribution', {
                valueAsNumber: true,
                min: { value: 0, message: 'Aporte deve ser positivo' },
              })}
              data-testid="investment-form-monthly-contribution"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Informe o valor planejado para investir mensalmente
          </p>
          {errors.monthlyContribution && (
            <p className="text-xs text-destructive">{errors.monthlyContribution.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
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
    </TooltipProvider>
  );
}
