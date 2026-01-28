'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Handshake,
  X,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  calculateDebtProgress,
  type Debt,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

type SortField = 'name' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface DebtLedgerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: Debt[];
  loading?: boolean;
}

// =============================================================================
// Animation Variants
// =============================================================================

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
};

// =============================================================================
// Summary Component
// =============================================================================

interface LedgerSummaryProps {
  totalCount: number;
  totalAmount: number;
  negotiatedCount: number;
  paidOffCount: number;
}

function LedgerSummary({
  totalCount,
  totalAmount,
  negotiatedCount,
  paidOffCount,
}: LedgerSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-6 py-3 border-b border-border"
    >
      <div className="text-center">
        <p className="text-xl font-semibold tabular-nums">{totalCount}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Total
        </p>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="text-center">
        <p className="text-xl font-semibold tabular-nums font-mono">
          {formatCurrency(totalAmount)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Valor
        </p>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="text-center">
        <p className="text-xl font-semibold tabular-nums">{negotiatedCount}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Negociadas
        </p>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="text-center">
        <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {paidOffCount}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Quitadas
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Sort Button Component
// =============================================================================

interface SortButtonProps {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
}

function SortButton({
  field,
  label,
  currentField,
  direction,
  onClick,
}: SortButtonProps) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onClick(field)}
      className={cn(
        'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
        isActive
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      {isActive && (
        <ArrowUpDown
          className={cn('h-3 w-3', direction === 'desc' && 'rotate-180')}
        />
      )}
    </button>
  );
}

// =============================================================================
// Ledger Item Component
// =============================================================================

interface LedgerItemProps {
  debt: Debt;
  index: number;
}

function LedgerItem({ debt, index }: LedgerItemProps) {
  const progress = calculateDebtProgress(debt);
  const isPaidOff = debt.status === 'paid_off';
  const isOverdue = debt.status === 'overdue';

  const getStatusIcon = () => {
    if (isPaidOff) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (isOverdue) return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    if (!debt.isNegotiated) return <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    return <Handshake className="h-3.5 w-3.5 text-foreground/60" />;
  };

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-border/50',
        'last:border-b-0',
        isPaidOff && 'opacity-50'
      )}
    >
      {/* Left: Number + Icon + Info */}
      <div className="flex items-center gap-2">
        <span className="w-5 text-xs text-muted-foreground tabular-nums text-right">
          {index + 1}.
        </span>
        <div className="shrink-0">{getStatusIcon()}</div>
      </div>

      {/* Center: Name + Badges (compact) */}
      <div className="min-w-0 flex items-center gap-2 flex-wrap">
        <h4
          className={cn(
            'text-sm font-medium truncate max-w-[180px]',
            isPaidOff && 'line-through'
          )}
        >
          {debt.name}
        </h4>
        {debt.creditor && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {debt.creditor}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {debt.isNegotiated ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/70">
              Negociada
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Pendente
            </span>
          )}
          {debt.isNegotiated && debt.totalInstallments && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {progress.paidInstallments}/{debt.totalInstallments}
            </span>
          )}
        </div>
      </div>

      {/* Right: Amount */}
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-semibold font-mono tabular-nums',
            isPaidOff && 'line-through text-muted-foreground'
          )}
        >
          {formatCurrency(debt.totalAmount)}
        </p>
        {debt.isNegotiated && debt.installmentAmount && !isPaidOff && (
          <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {formatCurrency(
              typeof debt.installmentAmount === 'string'
                ? parseFloat(debt.installmentAmount)
                : debt.installmentAmount
            )}
            /mês
          </p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LedgerSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function LedgerEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {hasSearch
          ? 'Nenhuma dívida encontrada para esta busca'
          : 'Nenhuma dívida cadastrada'}
      </p>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtLedgerDrawer - Full overview of all debts
 *
 * Editorial design with focus on readability and data hierarchy.
 * Read-only view - no actions, just overview.
 *
 * Features:
 * - Complete list of all debts (no month filtering)
 * - Search by name or creditor
 * - Sort by name, amount, or status
 * - Summary counters
 */
export function DebtLedgerDrawer({
  open,
  onOpenChange,
  debts,
  loading,
}: DebtLedgerDrawerProps) {
  // Search state
  const [search, setSearch] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort debts
  const filteredDebts = useMemo(() => {
    let result = [...debts];

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (debt) =>
          debt.name.toLowerCase().includes(searchLower) ||
          (debt.creditor && debt.creditor.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'pt-BR');
          break;
        case 'amount':
          comparison =
            (typeof a.totalAmount === 'string'
              ? parseFloat(a.totalAmount)
              : a.totalAmount) -
            (typeof b.totalAmount === 'string'
              ? parseFloat(b.totalAmount)
              : b.totalAmount);
          break;
        case 'status': {
          const statusOrder = {
            overdue: 0,
            active: 1,
            settled: 2,
            paid_off: 3,
            defaulted: 4,
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [debts, search, sortField, sortDirection]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalAmount = debts.reduce((sum, d) => {
      const amount =
        typeof d.totalAmount === 'string'
          ? parseFloat(d.totalAmount)
          : d.totalAmount;
      return sum + amount;
    }, 0);

    return {
      totalCount: debts.length,
      totalAmount,
      negotiatedCount: debts.filter((d) => d.isNegotiated).length,
      paidOffCount: debts.filter((d) => d.status === 'paid_off').length,
    };
  }, [debts]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] sm:max-w-2xl sm:mx-auto">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl tracking-tight">
                Livro de Dívidas
              </DrawerTitle>
              <DrawerDescription>
                Visão completa de todas as dívidas cadastradas
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>

          {/* Summary */}
          {!loading && debts.length > 0 && <LedgerSummary {...summary} />}

          {/* Search and Sort */}
          {!loading && debts.length > 0 && (
            <div className="flex items-center gap-2 pt-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
                <SortButton
                  field="name"
                  label="Nome"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                />
                <SortButton
                  field="amount"
                  label="Valor"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                />
                <SortButton
                  field="status"
                  label="Status"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </div>
            </div>
          )}
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <LedgerSkeleton />
          ) : filteredDebts.length === 0 ? (
            <LedgerEmptyState hasSearch={search.trim().length > 0} />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-border/50"
            >
              <AnimatePresence mode="popLayout">
                {filteredDebts.map((debt, index) => (
                  <LedgerItem key={debt.id} debt={debt} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Footer with count */}
        {!loading && filteredDebts.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Exibindo{' '}
              <span className="font-medium text-foreground tabular-nums">
                {filteredDebts.length}
              </span>{' '}
              de{' '}
              <span className="font-medium text-foreground tabular-nums">
                {debts.length}
              </span>{' '}
              dívidas
            </p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
