'use client';

import { motion } from 'framer-motion';
import {
  Wallet,
  Search,
  PartyPopper,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';

// =============================================================================
// Types
// =============================================================================

type IncomeEmptyStateType =
  | 'no-incomes'
  | 'filter-empty'
  | 'all-received';

interface IncomeEmptyStateProps {
  type: IncomeEmptyStateType;
  filterName?: string;
  totalReceived?: number;
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
  type: IncomeEmptyStateType,
  filterName?: string,
  totalReceived?: number
): StateConfig {
  switch (type) {
    case 'no-incomes':
      return {
        icon: Wallet,
        iconBg: 'bg-foreground/5',
        iconColor: 'text-muted-foreground',
        title: 'Nenhuma renda cadastrada',
        description:
          'Cadastre suas fontes de renda para acompanhar quanto você espera receber e quanto já recebeu.',
        actionLabel: 'Cadastrar Primeira Renda',
      };

    case 'filter-empty':
      return {
        icon: Search,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: `Nenhuma renda "${filterName || 'filtrada'}" encontrada`,
        description:
          filterName === 'Pendentes'
            ? 'Excelente! Todas as suas rendas já foram recebidas!'
            : `Não encontramos rendas com o filtro "${filterName || 'selecionado'}".`,
        actionLabel: 'Ver Todas as Rendas',
      };

    case 'all-received':
      return {
        icon: PartyPopper,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: 'Parabéns! Todas as rendas recebidas!',
        description: totalReceived
          ? `Você recebeu ${formatCurrency(totalReceived)} este mês. Continue assim!`
          : 'Você recebeu todas as suas rendas previstas. Isso é ótimo!',
        actionLabel: 'Adicionar Nova Renda',
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
 * IncomeEmptyState - Contextual empty states for the income management page
 *
 * Features:
 * - Different states for various scenarios
 * - Animated icons and content
 * - Celebration effects for "all received" state
 * - Action buttons for navigation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeEmptyState({
  type,
  filterName,
  totalReceived,
  onAction,
  onSecondaryAction,
  className,
}: IncomeEmptyStateProps) {
  const config = getStateConfig(type, filterName, totalReceived);
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
      data-testid={`income-empty-state-${type}`}
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
            {type === 'no-incomes' && <PlusCircle className="h-4 w-4" />}
            {type === 'all-received' && <CheckCircle2 className="h-4 w-4" />}
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

