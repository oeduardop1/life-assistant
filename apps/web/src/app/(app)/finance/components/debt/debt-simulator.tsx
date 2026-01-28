'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingDown,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency, type DebtTotals } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface DebtSimulatorProps {
  totals: DebtTotals;
  children: React.ReactNode;
}

interface SimulationResult {
  originalMonths: number;
  newMonths: number;
  monthsSaved: number;
  originalTotal: number;
  newTotal: number;
  savings: number;
  extraPaymentTotal: number;
}

// =============================================================================
// Result Card Component
// =============================================================================

interface ResultCardProps {
  label: string;
  originalValue: string;
  newValue: string;
  improvement?: string;
  isPositive?: boolean;
}

function ResultCard({
  label,
  originalValue,
  newValue,
  improvement,
  isPositive = true,
}: ResultCardProps) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground line-through">
            {originalValue}
          </p>
          <motion.p
            key={newValue}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'text-xl font-bold tabular-nums',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            )}
          >
            {newValue}
          </motion.p>
        </div>
        {improvement && (
          <motion.span
            key={improvement}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              'text-sm font-medium px-2 py-1 rounded-full',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {improvement}
          </motion.span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Comparison Bar Component
// =============================================================================

interface ComparisonBarProps {
  original: number;
  new_: number;
  label: string;
  formatValue: (value: number) => string;
}

function ComparisonBar({ original, new_, label, formatValue }: ComparisonBarProps) {
  const maxValue = Math.max(original, new_);
  const originalPercent = (original / maxValue) * 100;
  const newPercent = (new_ / maxValue) * 100;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Atual</span>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground/30 rounded-full"
              style={{ width: `${originalPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-20 text-right tabular-nums">
            {formatValue(original)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 w-12">Novo</span>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: `${originalPercent}%` }}
              animate={{ width: `${newPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <span className="text-xs font-medium w-20 text-right tabular-nums">
            {formatValue(new_)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtSimulator - Early payoff calculator
 *
 * Features:
 * - Interactive slider for extra payment amount
 * - Real-time calculation of new payoff date
 * - Visual comparison of original vs new timeline
 * - Savings calculation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtSimulator({ totals, children }: DebtSimulatorProps) {
  const [extraPayment, setExtraPayment] = useState(0);

  // Calculate max extra payment (100% of monthly)
  const maxExtra = Math.ceil(totals.monthlyInstallmentSum);

  // Simulation calculation
  const simulation = useMemo((): SimulationResult | null => {
    if (totals.monthlyInstallmentSum <= 0 || totals.totalRemaining <= 0) {
      return null;
    }

    const originalMonths = Math.ceil(
      totals.totalRemaining / totals.monthlyInstallmentSum
    );

    const newMonthlyPayment = totals.monthlyInstallmentSum + extraPayment;
    const newMonths = Math.ceil(totals.totalRemaining / newMonthlyPayment);

    const monthsSaved = originalMonths - newMonths;

    // For simplicity, we assume no interest (just installment-based debts)
    // In a more complex scenario, we'd calculate compound interest savings
    const extraPaymentTotal = extraPayment * newMonths;

    return {
      originalMonths,
      newMonths,
      monthsSaved,
      originalTotal: totals.totalRemaining,
      newTotal: totals.totalRemaining,
      savings: 0, // Would be interest savings in a more complex model
      extraPaymentTotal,
    };
  }, [totals, extraPayment]);

  const formatMonths = (months: number) => {
    if (months === 1) return '1 mês';
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return years === 1 ? '1 ano' : `${years} anos`;
    }
    return `${years}a ${remainingMonths}m`;
  };

  const getProjectedDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  if (!simulation) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-foreground/5">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg">Simulador de Quitação</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Veja como acelerar seus pagamentos
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Current Status */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Situação Atual</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Restante</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(totals.totalRemaining)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pagamento Mensal</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(totals.monthlyInstallmentSum)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Previsão Quitação</p>
                <p className="font-semibold">
                  {formatMonths(simulation.originalMonths)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Data Estimada</p>
                <p className="font-semibold">
                  {getProjectedDate(simulation.originalMonths)}
                </p>
              </div>
            </div>
          </div>

          {/* Extra Payment Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Pagamento Extra Mensal</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px] text-xs">
                        Valor adicional que você pagaria todo mês além das parcelas normais.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <motion.span
                key={extraPayment}
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-lg font-bold tabular-nums"
              >
                {formatCurrency(extraPayment)}
              </motion.span>
            </div>

            <Slider
              value={[extraPayment]}
              onValueChange={([v]: number[]) => setExtraPayment(v)}
              min={0}
              max={maxExtra}
              step={50}
              className="py-2"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>R$ 0</span>
              <span>{formatCurrency(maxExtra)}</span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              {[0, 100, 250, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setExtraPayment(Math.min(amount, maxExtra))}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-colors',
                    extraPayment === amount
                      ? 'bg-foreground text-background'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {amount === 0 ? 'Nenhum' : `+${formatCurrency(amount)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {extraPayment > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Timeline Comparison */}
              <ComparisonBar
                original={simulation.originalMonths}
                new_={simulation.newMonths}
                label="Tempo até Quitação"
                formatValue={formatMonths}
              />

              {/* Results Grid */}
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label="Quitação em"
                  originalValue={formatMonths(simulation.originalMonths)}
                  newValue={formatMonths(simulation.newMonths)}
                  improvement={`-${simulation.monthsSaved} ${simulation.monthsSaved === 1 ? 'mês' : 'meses'}`}
                />
                <ResultCard
                  label="Data Estimada"
                  originalValue={getProjectedDate(simulation.originalMonths)}
                  newValue={getProjectedDate(simulation.newMonths)}
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      Você quitaria {simulation.monthsSaved} {simulation.monthsSaved === 1 ? 'mês' : 'meses'} mais cedo!
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      Pagamento extra total: {formatCurrency(simulation.extraPaymentTotal)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {extraPayment === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Use o slider acima para simular pagamentos extras
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
