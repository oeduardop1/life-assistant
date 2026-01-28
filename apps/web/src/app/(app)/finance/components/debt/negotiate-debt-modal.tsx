'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Loader2,
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useNegotiateDebt } from '../../hooks/use-debts';
import {
  formatCurrency,
  getCurrentMonth,
  calculateDebtEndMonth,
  formatMonthDisplay,
  type Debt,
} from '../../types';
import { MonthPicker } from '../month-picker';

// =============================================================================
// Types
// =============================================================================

interface NegotiateFormData {
  totalInstallments: number;
  installmentAmount: number;
  dueDay: number;
  startMonthYear: string;
}

interface NegotiateDebtModalProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Calculator Mode Selector
// =============================================================================

type CalculatorMode = 'installment' | 'total';

interface ModeSelectorProps {
  mode: CalculatorMode;
  onChange: (mode: CalculatorMode) => void;
}

function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-lg">
      <button
        type="button"
        onClick={() => onChange('installment')}
        className={cn(
          'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'installment'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Por Parcela
      </button>
      <button
        type="button"
        onClick={() => onChange('total')}
        className={cn(
          'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'total'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Por Total
      </button>
    </div>
  );
}

// =============================================================================
// Value Comparison Component
// =============================================================================

interface ValueComparisonProps {
  original: number;
  negotiated: number;
  difference: number;
  percentChange: number;
}

function ValueComparison({
  original,
  negotiated,
  difference,
  percentChange,
}: ValueComparisonProps) {
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;

  return (
    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
      {/* Original Value */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Valor Original</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatCurrency(original)}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            isIncrease && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            isDecrease && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            !isIncrease && !isDecrease && 'bg-muted text-muted-foreground'
          )}
        >
          {isIncrease && <TrendingUp className="h-3 w-3" />}
          {isDecrease && <TrendingDown className="h-3 w-3" />}
          <span>
            {isIncrease ? '+' : ''}
            {percentChange.toFixed(1)}%
          </span>
        </motion.div>
      </div>

      {/* Negotiated Value */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Valor Negociado</p>
        <motion.p
          key={negotiated}
          initial={{ scale: 0.95, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'text-lg font-semibold tabular-nums',
            isIncrease && 'text-amber-600 dark:text-amber-400',
            isDecrease && 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {formatCurrency(negotiated)}
        </motion.p>
      </div>
    </div>
  );
}

// =============================================================================
// Interactive Slider Input
// =============================================================================

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
  tooltip?: string;
  formatValue?: (value: number) => string;
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  prefix,
  tooltip,
  formatValue,
}: SliderInputProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <motion.div
          key={value}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1 text-lg font-semibold tabular-nums"
        >
          {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
          {displayValue}
          {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
        </motion.div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]: number[]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{prefix}{formatValue ? formatValue(min) : min}{suffix}</span>
        <span>{prefix}{formatValue ? formatValue(max) : max}{suffix}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Timeline Preview Component
// =============================================================================

interface TimelinePreviewProps {
  startMonth: string;
  totalInstallments: number;
  installmentAmount: number;
}

function TimelinePreview({
  startMonth,
  totalInstallments,
  installmentAmount,
}: TimelinePreviewProps) {
  const endMonth = calculateDebtEndMonth(startMonth, totalInstallments);

  // Show first 3 and last 2 installments
  const visibleInstallments = useMemo(() => {
    if (totalInstallments <= 5) {
      return Array.from({ length: totalInstallments }, (_, i) => i + 1);
    }
    return [1, 2, 3, -1, totalInstallments - 1, totalInstallments];
  }, [totalInstallments]);

  const getInstallmentMonth = (index: number) => {
    const [year, month] = startMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + index - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Timeline de Pagamentos</span>
      </div>

      {/* Visual Timeline */}
      <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
        {visibleInstallments.map((num, idx) => (
          <div key={idx} className="flex items-center">
            {num === -1 ? (
              <div className="flex items-center gap-1 px-2 text-muted-foreground">
                <span className="text-xs">•••</span>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col items-center min-w-[60px]"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                    num === 1
                      ? 'bg-foreground text-background'
                      : num === totalInstallments
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {num}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {getInstallmentMonth(num)}
                </span>
                <span className="text-[10px] font-medium tabular-nums">
                  {formatCurrency(installmentAmount)}
                </span>
              </motion.div>
            )}
            {idx < visibleInstallments.length - 1 && num !== -1 && visibleInstallments[idx + 1] !== -1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center pt-2 border-t border-border/50">
        <div className="text-sm">
          <span className="text-muted-foreground">Início:</span>{' '}
          <span className="font-medium">{formatMonthDisplay(startMonth)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Fim:</span>{' '}
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatMonthDisplay(endMonth)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Summary Panel Component
// =============================================================================

interface SummaryPanelProps {
  installments: number;
  installmentAmount: number;
  dueDay: number;
  totalAmount: number;
  difference: number;
}

function SummaryPanel({
  installments,
  installmentAmount,
  dueDay,
  totalAmount,
  difference,
}: SummaryPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-foreground/5 border-2 border-foreground/10 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        <span className="text-sm font-semibold">Resumo da Negociação</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Parcelas:</span>
          <span className="font-medium tabular-nums">{installments}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor:</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(installmentAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vencimento:</span>
          <span className="font-medium">Dia {dueDay}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {difference > 0 ? 'Juros:' : difference < 0 ? 'Desconto:' : 'Diferença:'}
          </span>
          <span
            className={cn(
              'font-medium tabular-nums',
              difference > 0 && 'text-amber-600 dark:text-amber-400',
              difference < 0 && 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {difference !== 0 && (difference > 0 ? '+' : '')}
            {formatCurrency(Math.abs(difference))}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-border/50 flex justify-between items-center">
        <span className="font-medium">Total a Pagar:</span>
        <span className="text-xl font-bold tabular-nums">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * NegotiateDebtModal - Interactive calculator for debt negotiation
 *
 * Features:
 * - Real-time interest/discount calculation
 * - Visual comparison with original amount
 * - Interactive sliders for quick adjustments
 * - Timeline preview of payment schedule
 * - Two calculation modes: by installment or by total
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function NegotiateDebtModal({
  debt,
  open,
  onOpenChange,
}: NegotiateDebtModalProps) {
  const negotiateDebt = useNegotiateDebt();
  const [mode, setMode] = useState<CalculatorMode>('installment');

  const suggestedInstallment = debt ? Math.ceil(debt.totalAmount / 12) : 0;

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
  } = useForm<NegotiateFormData>({
    defaultValues: {
      totalInstallments: 12,
      installmentAmount: suggestedInstallment,
      dueDay: 10,
      startMonthYear: getCurrentMonth(),
    },
  });

  const totalInstallments = watch('totalInstallments');
  const installmentAmount = watch('installmentAmount');
  const dueDay = watch('dueDay');
  const startMonthYear = watch('startMonthYear');

  // Reset form when debt changes
  useEffect(() => {
    if (debt && open) {
      const suggested = Math.ceil(debt.totalAmount / 12);
      reset({
        totalInstallments: 12,
        installmentAmount: suggested,
        dueDay: 10,
        startMonthYear: getCurrentMonth(),
      });
    }
  }, [debt, open, reset]);

  // Calculate derived values
  const totalNegotiated = totalInstallments * installmentAmount;
  const difference = debt ? totalNegotiated - debt.totalAmount : 0;
  const percentChange = debt && debt.totalAmount > 0
    ? ((totalNegotiated - debt.totalAmount) / debt.totalAmount) * 100
    : 0;

  // Update installment amount when mode is "total" and installments change
  const handleInstallmentsChange = (value: number) => {
    setValue('totalInstallments', value);
    if (mode === 'total' && debt) {
      // Maintain total, recalculate installment
      const newInstallment = Math.ceil(totalNegotiated / value);
      setValue('installmentAmount', newInstallment);
    }
  };

  // Update total when mode is "installment" and amount changes
  const handleAmountChange = (value: number) => {
    setValue('installmentAmount', value);
  };

  const onSubmit = async (data: NegotiateFormData) => {
    if (!debt) return;

    try {
      await negotiateDebt.mutateAsync({
        id: debt.id,
        data: {
          totalInstallments: data.totalInstallments,
          installmentAmount: data.installmentAmount,
          dueDay: data.dueDay,
          startMonthYear: data.startMonthYear,
        },
      });

      toast.success('Dívida negociada com sucesso!');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao negociar dívida. Tente novamente.');
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto"
        data-testid="negotiate-debt-modal"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-foreground/5">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg">Negociar Dívida</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                {debt.name}
                {debt.creditor && ` · ${debt.creditor}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Mode Selector */}
          <ModeSelector mode={mode} onChange={setMode} />

          {/* Value Comparison */}
          <ValueComparison
            original={debt.totalAmount}
            negotiated={totalNegotiated}
            difference={difference}
            percentChange={percentChange}
          />

          {/* Interactive Sliders */}
          <div className="space-y-5 py-2">
            {/* Installments Slider */}
            <SliderInput
              label="Número de Parcelas"
              value={totalInstallments}
              onChange={handleInstallmentsChange}
              min={1}
              max={60}
              step={1}
              suffix="x"
              tooltip="Quantidade total de parcelas para quitar a dívida"
            />

            {/* Amount Slider */}
            <SliderInput
              label="Valor da Parcela"
              value={installmentAmount}
              onChange={handleAmountChange}
              min={Math.max(50, Math.floor(debt.totalAmount / 60))}
              max={Math.ceil(debt.totalAmount * 1.5)}
              step={10}
              prefix="R$ "
              formatValue={(v) => v.toLocaleString('pt-BR')}
              tooltip="Valor de cada parcela mensal"
            />

            {/* Due Day Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Dia de Vencimento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setValue('dueDay', parseInt(e.target.value) || 10)}
                    className="w-16 h-8 text-center tabular-nums"
                  />
                </div>
              </div>
              <div className="flex gap-1">
                {[5, 10, 15, 20, 25].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setValue('dueDay', day)}
                    className={cn(
                      'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                      dueDay === day
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Month */}
            <MonthPicker
              value={startMonthYear}
              onChange={(month) => setValue('startMonthYear', month)}
              label="Mês da Primeira Parcela"
              disabled={negotiateDebt.isPending}
              data-testid="negotiate-form-start-month"
            />
          </div>

          {/* Timeline Preview */}
          <TimelinePreview
            startMonth={startMonthYear}
            totalInstallments={totalInstallments}
            installmentAmount={installmentAmount}
          />

          {/* Summary Panel */}
          <SummaryPanel
            installments={totalInstallments}
            installmentAmount={installmentAmount}
            dueDay={dueDay}
            totalAmount={totalNegotiated}
            difference={difference}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={negotiateDebt.isPending}
              className="flex-1"
              data-testid="negotiate-form-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={negotiateDebt.isPending}
              className="flex-1 gap-2"
              data-testid="negotiate-form-submit"
            >
              {negotiateDebt.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Confirmar Negociação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
