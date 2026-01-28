'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  PiggyBank,
  Target,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  investmentTypeLabels,
  investmentTypeColors,
  calculateInvestmentProgress,
  formatInvestmentDeadline,
  type Investment,
} from '../../types';
import { InvestmentProgressBar } from './investment-progress-bar';

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onUpdateValue: (investment: Investment) => void;
}

const badgeColorClasses: Record<string, string> = {
  green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const iconColorClasses: Record<string, string> = {
  green: 'bg-green-500/10 text-green-500',
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  orange: 'bg-orange-500/10 text-orange-500',
  indigo: 'bg-indigo-500/10 text-indigo-500',
  gray: 'bg-gray-500/10 text-gray-500',
};

/**
 * Card component for displaying a single investment
 * Shows name, type, value, progress, and actions
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentCard({
  investment,
  onEdit,
  onDelete,
  onUpdateValue,
}: InvestmentCardProps) {
  const typeColor = investmentTypeColors[investment.type] || 'gray';
  const progress = calculateInvestmentProgress(investment);
  const hasGoal = progress.goalAmount !== null && progress.goalAmount > 0;
  const monthlyContribution = investment.monthlyContribution
    ? parseFloat(investment.monthlyContribution)
    : null;

  // Status-based border color
  const getStatusBorderClass = () => {
    if (progress.progressPercent >= 100) return 'border-l-emerald-500';
    if (progress.progressPercent >= 50) return 'border-l-blue-500';
    return 'border-l-amber-500';
  };

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className="transition-shadow duration-150 hover:shadow-md rounded-lg"
    >
      <Card
        data-testid="investment-card"
        className={cn('border-l-4', hasGoal ? getStatusBorderClass() : 'border-l-purple-500')}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Icon + Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon */}
              <div className={cn('rounded-lg p-2 shrink-0', iconColorClasses[typeColor])}>
                <PiggyBank className="h-5 w-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name - Enhanced typography */}
                <h3
                  className="font-semibold text-base truncate"
                  data-testid="investment-name"
                >
                  {investment.name}
                </h3>

                {/* Type Badge */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', badgeColorClasses[typeColor])}
                    data-testid="investment-type-badge"
                  >
                    {investmentTypeLabels[investment.type]}
                  </Badge>

                  {/* Deadline Badge */}
                  {investment.deadline && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      data-testid="investment-deadline-badge"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatInvestmentDeadline(investment.deadline)}
                    </Badge>
                  )}
                </div>

                {/* Progress Bar (if has goal) */}
                {hasGoal && (
                  <div className="mt-3">
                    <InvestmentProgressBar
                      currentAmount={progress.currentAmount}
                      goalAmount={progress.goalAmount}
                      showLabel
                      showMilestones
                      size="md"
                    />
                  </div>
                )}

                {/* Stats Row */}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {/* Goal */}
                  {hasGoal && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span data-testid="investment-goal">
                        Meta: {formatCurrency(progress.goalAmount!)}
                      </span>
                    </div>
                  )}

                  {/* Monthly Contribution */}
                  {monthlyContribution && monthlyContribution > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span data-testid="investment-contribution">
                        {formatCurrency(monthlyContribution)}/mes
                      </span>
                    </div>
                  )}

                  {/* Months to goal */}
                  {progress.monthsToGoal !== null && (
                    <span className="text-muted-foreground" data-testid="investment-months-to-goal">
                      ~{progress.monthsToGoal} meses restantes
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Value + Actions */}
            <div className="flex items-start gap-2 shrink-0">
              {/* Current Value - Enhanced typography */}
              <div className="text-right">
                <p
                  className="text-lg font-bold font-mono tabular-nums"
                  data-testid="investment-current-amount"
                >
                  {formatCurrency(progress.currentAmount)}
                </p>
                {hasGoal && progress.remainingAmount !== null && progress.remainingAmount > 0 && (
                  <p
                    className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5"
                    data-testid="investment-remaining"
                  >
                    Faltam {formatCurrency(progress.remainingAmount)}
                  </p>
                )}
              </div>

              {/* Quick Update Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onUpdateValue(investment)}
                data-testid="investment-quick-update"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Atualizar valor</span>
              </Button>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    data-testid="investment-actions-trigger"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Acoes</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEdit(investment)}
                    data-testid="investment-edit-action"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(investment)}
                    className="text-destructive focus:text-destructive"
                    data-testid="investment-delete-action"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
