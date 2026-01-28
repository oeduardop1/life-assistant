'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Search,
  PlusCircle,
  PartyPopper,
  FileText,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';

// =============================================================================
// Types
// =============================================================================

type EmptyStateType =
  | 'no-debts'
  | 'filter-empty'
  | 'all-paid'
  | 'no-pending'
  | 'no-active'
  | 'no-overdue';

interface DebtEmptyStateProps {
  type: EmptyStateType;
  filterName?: string;
  totalPaid?: number;
  monthsPaid?: number;
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
// Celebration Particles
// =============================================================================

// Pre-computed random positions for celebration particles
const PARTICLE_POSITIONS = [
  { x: 15, y: 25 }, { x: 85, y: 35 }, { x: 45, y: 15 },
  { x: 70, y: 80 }, { x: 25, y: 65 }, { x: 55, y: 45 },
  { x: 10, y: 90 }, { x: 90, y: 10 }, { x: 35, y: 75 },
  { x: 60, y: 30 }, { x: 20, y: 50 }, { x: 80, y: 60 },
];

function CelebrationParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_POSITIONS.map((pos, i) => (
        <motion.div
          key={i}
          className={cn(
            'absolute w-2 h-2 rounded-full',
            i % 3 === 0 && 'bg-emerald-400',
            i % 3 === 1 && 'bg-blue-400',
            i % 3 === 2 && 'bg-amber-400'
          )}
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${pos.x}%`,
            y: `${pos.y}%`,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Empty State Configurations
// =============================================================================

interface StateConfig {
  icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  showCelebration?: boolean;
}

function getStateConfig(
  type: EmptyStateType,
  filterName?: string,
  totalPaid?: number,
  monthsPaid?: number
): StateConfig {
  switch (type) {
    case 'no-debts':
      return {
        icon: FileText,
        iconBg: 'bg-foreground/5',
        iconColor: 'text-muted-foreground',
        title: 'Nenhuma dívida cadastrada',
        description:
          'Cadastre suas dívidas para acompanhar seu progresso financeiro e ter controle total sobre seus pagamentos.',
        actionLabel: 'Adicionar Primeira Dívida',
      };

    case 'filter-empty':
      return {
        icon: Search,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: `Nenhuma dívida "${filterName || 'filtrada'}"`,
        description:
          filterName === 'Em Atraso'
            ? 'Excelente! Você não tem nenhuma dívida em atraso. Continue assim!'
            : `Não encontramos dívidas com o filtro "${filterName || 'selecionado'}".`,
        actionLabel: 'Ver Todas as Dívidas',
      };

    case 'no-overdue':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Tudo em dia!',
        description:
          'Parabéns! Você não tem nenhuma dívida em atraso. Continue mantendo seus pagamentos em dia.',
        actionLabel: 'Ver Dívidas Ativas',
      };

    case 'no-pending':
      return {
        icon: TrendingUp,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Nenhuma dívida pendente',
        description:
          'Você não tem dívidas aguardando negociação. Todas as suas dívidas já possuem condições de pagamento definidas.',
        actionLabel: 'Ver Dívidas Ativas',
        secondaryActionLabel: 'Adicionar Nova Dívida',
      };

    case 'no-active':
      return {
        icon: Calendar,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400',
        title: 'Nenhuma dívida ativa',
        description:
          'Você não tem dívidas ativas no momento. Cadastre novas dívidas ou veja o histórico de dívidas quitadas.',
        actionLabel: 'Adicionar Nova Dívida',
        secondaryActionLabel: 'Ver Quitadas',
      };

    case 'all-paid':
      return {
        icon: PartyPopper,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Parabéns! Todas as dívidas quitadas!',
        description: totalPaid
          ? `Você quitou ${formatCurrency(totalPaid)}${monthsPaid ? ` em ${monthsPaid} meses` : ''}. Incrível conquista!`
          : 'Você quitou todas as suas dívidas. Isso é uma grande conquista!',
        actionLabel: 'Ver Dívidas Quitadas',
        secondaryActionLabel: 'Adicionar Nova Dívida',
        showCelebration: true,
      };

    default:
      return {
        icon: FileText,
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
 * DebtEmptyState - Contextual empty states for the debt management page
 *
 * Features:
 * - Different states for various scenarios
 * - Animated icons and content
 * - Celebration effects for "all paid" state
 * - Action buttons for navigation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtEmptyState({
  type,
  filterName,
  totalPaid,
  monthsPaid,
  onAction,
  onSecondaryAction,
  className,
}: DebtEmptyStateProps) {
  const config = getStateConfig(type, filterName, totalPaid, monthsPaid);
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
      data-testid={`debt-empty-state-${type}`}
    >
      {/* Celebration Particles */}
      {config.showCelebration && <CelebrationParticles />}

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
            {type === 'no-debts' && <PlusCircle className="h-4 w-4" />}
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
            💪
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
 * SectionEmptyState - Simple inline empty state for list sections
 */
export function SectionEmptyState({ message, className }: SectionEmptyStateProps) {
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
