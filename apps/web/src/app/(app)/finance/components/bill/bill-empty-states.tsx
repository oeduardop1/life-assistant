'use client';

import { motion } from 'framer-motion';
import {
  Receipt,
  Search,
  PartyPopper,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';
import { CelebrationConfetti } from './bill-animations';

// =============================================================================
// Types
// =============================================================================

export type BillEmptyStateType =
  | 'no-bills'
  | 'filter-empty'
  | 'all-paid'
  | 'no-overdue';

interface BillEmptyStateProps {
  type: BillEmptyStateType;
  filterName?: string;
  totalPaid?: number;
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
  icon: typeof Receipt;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  showCelebration?: boolean;
}

function getStateConfig(
  type: BillEmptyStateType,
  filterName?: string,
  totalPaid?: number
): StateConfig {
  switch (type) {
    case 'no-bills':
      return {
        icon: Receipt,
        iconBg: 'bg-foreground/5',
        iconColor: 'text-muted-foreground',
        title: 'Nenhuma conta cadastrada',
        description:
          'Cadastre suas contas fixas para acompanhar seus gastos mensais e nunca perder um vencimento.',
        actionLabel: 'Cadastrar Primeira Conta',
      };

    case 'filter-empty':
      return {
        icon: Search,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: `Nenhuma conta "${filterName || 'filtrada'}" encontrada`,
        description:
          filterName === 'Pendentes'
            ? 'Excelente! Todas as suas contas já foram pagas!'
            : `Não encontramos contas com o filtro "${filterName || 'selecionado'}".`,
        actionLabel: 'Ver Todas as Contas',
      };

    case 'all-paid':
      return {
        icon: PartyPopper,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Parabéns! Todas as contas pagas!',
        description: totalPaid
          ? `Você pagou ${formatCurrency(totalPaid)} este mês. Continue assim!`
          : 'Você pagou todas as suas contas deste mês. Isso é ótimo!',
        actionLabel: 'Ver Histórico',
        secondaryActionLabel: 'Adicionar Nova Conta',
        showCelebration: true,
      };

    case 'no-overdue':
      return {
        icon: ShieldCheck,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Nenhuma conta vencida',
        description:
          'Ótimo trabalho! Você não tem nenhuma conta em atraso.',
        actionLabel: 'Ver Todas as Contas',
      };

    default:
      return {
        icon: Receipt,
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
 * BillEmptyState - Contextual empty states for the bill management page
 *
 * Features:
 * - Different states for various scenarios
 * - Animated icons and content
 * - Celebration effects for "all paid" state
 * - Action buttons for navigation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillEmptyState({
  type,
  filterName,
  totalPaid,
  onAction,
  onSecondaryAction,
  className,
}: BillEmptyStateProps) {
  const config = getStateConfig(type, filterName, totalPaid);
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
      data-testid={`bill-empty-state-${type}`}
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
            {type === 'no-bills' && <PlusCircle className="h-4 w-4" />}
            {type === 'all-paid' && <CheckCircle2 className="h-4 w-4" />}
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
 * BillSectionEmptyState - Simple inline empty state for list sections
 */
export function BillSectionEmptyState({ message, className }: SectionEmptyStateProps) {
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
