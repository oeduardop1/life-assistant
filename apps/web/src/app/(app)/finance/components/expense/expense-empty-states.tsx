'use client';

import { motion } from 'framer-motion';
import {
  Wallet,
  PartyPopper,
  PlusCircle,
  CheckCircle2,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';
import { CelebrationConfetti } from './expense-animations';

// =============================================================================
// Types
// =============================================================================

type ExpenseEmptyStateType =
  | 'no-expenses'
  | 'filter-empty-recurring'
  | 'filter-empty-onetime'
  | 'filter-empty-overbudget'
  | 'all-on-budget';

interface ExpenseEmptyStateProps {
  type: ExpenseEmptyStateType;
  savings?: number;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
}

// =============================================================================
// Animation Variants
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

// =============================================================================
// State Configurations
// =============================================================================

interface StateConfig {
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  showCelebration?: boolean;
}

function getStateConfig(
  type: ExpenseEmptyStateType,
  savings?: number
): StateConfig {
  switch (type) {
    case 'no-expenses':
      return {
        icon: Wallet,
        iconBg: 'bg-foreground/5',
        iconColor: 'text-muted-foreground',
        title: 'Nenhuma despesa variável este mês',
        description:
          'Despesas variáveis são gastos que mudam mês a mês, como alimentação, transporte e lazer.',
        actionLabel: 'Adicionar Primeira Despesa',
      };

    case 'filter-empty-recurring':
      return {
        icon: RefreshCcw,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Nenhuma despesa recorrente encontrada',
        description:
          'Você pode criar despesas recorrentes para gastos que se repetem todo mês, como mercado ou combustível.',
        actionLabel: 'Nova Despesa Recorrente',
        secondaryActionLabel: 'Ver Todas',
      };

    case 'filter-empty-onetime':
      return {
        icon: Zap,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-600 dark:text-purple-400',
        title: 'Nenhuma despesa pontual encontrada',
        description:
          'Despesas pontuais são gastos únicos deste mês, como presentes, reparos ou compras especiais.',
        actionLabel: 'Nova Despesa Pontual',
        secondaryActionLabel: 'Ver Todas',
      };

    case 'filter-empty-overbudget':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Nenhuma despesa acima do orçamento',
        description:
          'Excelente! Todas as suas despesas estão dentro do orçamento previsto.',
        actionLabel: 'Ver Todas',
      };

    case 'all-on-budget':
      return {
        icon: PartyPopper,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Parabéns! Todas as despesas no orçamento!',
        description: savings
          ? `Você está ${formatCurrency(Math.abs(savings))} abaixo do previsto este mês.`
          : 'Você está dentro do orçamento em todas as despesas!',
        showCelebration: true,
      };

    default:
      return {
        icon: Wallet,
        iconBg: 'bg-foreground/5',
        iconColor: 'text-muted-foreground',
        title: 'Nenhum resultado',
        description: 'Não encontramos nenhum item para exibir.',
        actionLabel: 'Ver Todas',
      };
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ExpenseEmptyState - Contextual empty states for the expense management page
 *
 * Features:
 * - Different states for various scenarios
 * - Animated icons and content
 * - Celebration effects for "all on budget" state
 * - Action buttons for navigation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseEmptyState({
  type,
  savings,
  onAction,
  onSecondaryAction,
  className,
}: ExpenseEmptyStateProps) {
  const config = getStateConfig(type, savings);
  const Icon = config.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative flex flex-col items-center justify-center py-16 px-8 text-center',
        className
      )}
      data-testid={`expense-empty-state-${type}`}
    >
      {/* Celebration Confetti */}
      {config.showCelebration && <CelebrationConfetti />}

      {/* Icon */}
      <motion.div
        variants={iconVariants}
        className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
          config.iconBg
        )}
      >
        <Icon className={cn('h-10 w-10', config.iconColor)} />
      </motion.div>

      {/* Title */}
      <motion.h3
        variants={itemVariants}
        className="text-xl font-semibold mb-2"
      >
        {config.title}
      </motion.h3>

      {/* Description */}
      <motion.p
        variants={itemVariants}
        className="text-muted-foreground max-w-md mb-6"
      >
        {config.description}
      </motion.p>

      {/* Actions */}
      <motion.div variants={itemVariants} className="flex gap-3">
        {config.actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            {type === 'no-expenses' && <PlusCircle className="h-4 w-4" />}
            {(type === 'filter-empty-recurring' || type === 'filter-empty-onetime') && (
              <PlusCircle className="h-4 w-4" />
            )}
            {config.actionLabel}
          </Button>
        )}
        {config.secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {config.secondaryActionLabel}
          </Button>
        )}
      </motion.div>

      {/* Decorative Elements for Celebration */}
      {config.showCelebration && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-8 left-1/4 text-4xl"
          >
            ✨
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute top-12 right-1/4 text-3xl"
          >
            🎉
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="absolute bottom-16 left-1/3 text-2xl"
          >
            💰
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// =============================================================================
// Section Empty State
// =============================================================================

interface SectionEmptyStateProps {
  message: string;
  className?: string;
}

/**
 * ExpenseSectionEmptyState - Simple inline empty state for list sections
 */
export function ExpenseSectionEmptyState({ message, className }: SectionEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex items-center justify-center py-8 px-4 text-center',
        'border-2 border-dashed border-border/50 rounded-xl',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}
