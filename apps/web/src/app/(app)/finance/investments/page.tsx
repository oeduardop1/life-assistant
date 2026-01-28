'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, RefreshCw, PiggyBank, Filter, ArrowUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInvestments } from '../hooks/use-investments';
import {
  InvestmentList,
  InvestmentSummary,
  CreateInvestmentModal,
  EditInvestmentModal,
  UpdateValueModal,
  DeleteInvestmentDialog,
} from '../components/investment';
import {
  AnimatedEmptyState,
  AnimatedIcon,
} from '../components/investment/investment-animations';
import {
  calculateInvestmentTotals,
  calculateInvestmentProgress,
  investmentTypeOptions,
  type Investment,
  type InvestmentType,
} from '../types';

// =============================================================================
// Types
// =============================================================================

type SortOption = 'name' | 'progress' | 'amount' | 'deadline';
type TypeFilter = 'all' | InvestmentType;

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  onAddClick: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

function EmptyState({ onAddClick, hasFilters, onClearFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <AnimatedEmptyState className="flex flex-col items-center justify-center py-12 text-center">
        <AnimatedIcon>
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
        </AnimatedIcon>
        <h3 className="text-lg font-semibold mb-2">Nenhum investimento encontrado</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Nenhum investimento corresponde aos filtros selecionados.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar filtros
        </Button>
      </AnimatedEmptyState>
    );
  }

  return (
    <AnimatedEmptyState
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="investments-empty-state"
    >
      <AnimatedIcon>
        <div className="rounded-full bg-muted p-4 mb-4">
          <PiggyBank className="h-12 w-12 text-muted-foreground" />
        </div>
      </AnimatedIcon>
      <h3 className="text-lg font-semibold mb-2">Comece sua jornada de investimentos</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Cadastre seus investimentos e acompanhe o progresso das suas metas financeiras ao longo do tempo.
      </p>
      <Button onClick={onAddClick} size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Investimento
      </Button>
    </AnimatedEmptyState>
  );
}

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <AnimatedEmptyState
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="investments-error-state"
    >
      <AnimatedIcon>
        <div className="rounded-full bg-red-500/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
      </AnimatedIcon>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar investimentos</h3>
      <p className="text-muted-foreground mb-4">
        Nao foi possivel carregar a lista de investimentos.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </AnimatedEmptyState>
  );
}

// =============================================================================
// Page Header
// =============================================================================

interface PageHeaderProps {
  onAddClick: () => void;
}

function PageHeader({ onAddClick }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Investimentos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie seus investimentos e acompanhe suas metas
        </p>
      </div>
      <Button onClick={onAddClick} data-testid="add-investment-button">
        <Plus className="h-4 w-4 mr-2" />
        Novo Investimento
      </Button>
    </div>
  );
}

// =============================================================================
// Filter Bar
// =============================================================================

interface FilterBarProps {
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

function FilterBar({
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
  searchQuery,
  onSearchQueryChange,
}: FilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 flex-wrap"
    >
      {/* Type Filter */}
      <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}>
        <SelectTrigger className="w-[180px]" data-testid="investment-type-filter">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {investmentTypeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortOption)}>
        <SelectTrigger className="w-[160px]" data-testid="investment-sort-select">
          <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="progress">Progresso</SelectItem>
          <SelectItem value="amount">Valor</SelectItem>
          <SelectItem value="deadline">Prazo</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar investimento..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9"
          data-testid="investment-search-input"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchQueryChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Investments Page
 *
 * Lists all investments with CRUD operations, filtering, sorting, and value update functionality.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function InvestmentsPage() {
  // Data fetching
  const { data, isLoading, isError, refetch } = useInvestments();
  const investments = useMemo(() => data?.investments ?? [], [data?.investments]);

  // Filter/Sort state
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [updatingValueInvestment, setUpdatingValueInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);

  // Filtered and sorted investments
  const filteredInvestments = useMemo(() => {
    let result = [...investments];

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((inv) => inv.type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((inv) =>
        inv.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress': {
          const progressA = calculateInvestmentProgress(a).progressPercent;
          const progressB = calculateInvestmentProgress(b).progressPercent;
          return progressB - progressA; // Descending
        }
        case 'amount': {
          const amountA = parseFloat(a.currentAmount) || 0;
          const amountB = parseFloat(b.currentAmount) || 0;
          return amountB - amountA; // Descending
        }
        case 'deadline': {
          // Investments without deadline go to the end
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [investments, typeFilter, sortBy, searchQuery]);

  // Calculate totals from all investments (not filtered)
  const totals = calculateInvestmentTotals(investments);

  // Check if filters are active
  const hasActiveFilters = typeFilter !== 'all' || searchQuery.trim() !== '';

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter('all');
    setSearchQuery('');
  };

  // Handlers
  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
  };

  const handleDelete = (investment: Investment) => {
    setDeletingInvestment(investment);
  };

  const handleUpdateValue = (investment: Investment) => {
    setUpdatingValueInvestment(investment);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingInvestment(null);
    }
  };

  const handleUpdateValueModalOpenChange = (open: boolean) => {
    if (!open) {
      setUpdatingValueInvestment(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingInvestment(null);
    }
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state (no investments at all)
  const hasNoInvestments = !isLoading && investments.length === 0;

  // Empty state after filtering
  const hasNoFilteredResults = !isLoading && investments.length > 0 && filteredInvestments.length === 0;

  return (
    <div className="space-y-6" data-testid="investments-page">
      {/* Header */}
      <PageHeader onAddClick={() => setCreateModalOpen(true)} />

      {/* Summary */}
      <InvestmentSummary totals={totals} loading={isLoading} />

      {/* Filter Bar - only show if there are investments */}
      {!hasNoInvestments && (
        <FilterBar
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      {/* List or Empty State */}
      {hasNoInvestments ? (
        <EmptyState onAddClick={() => setCreateModalOpen(true)} />
      ) : hasNoFilteredResults ? (
        <EmptyState
          onAddClick={() => setCreateModalOpen(true)}
          hasFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      ) : (
        <InvestmentList
          investments={filteredInvestments}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateValue={handleUpdateValue}
        />
      )}

      {/* Modals and Dialogs */}
      <CreateInvestmentModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
      />

      <EditInvestmentModal
        investment={editingInvestment}
        open={!!editingInvestment}
        onOpenChange={handleEditModalOpenChange}
      />

      <UpdateValueModal
        investment={updatingValueInvestment}
        open={!!updatingValueInvestment}
        onOpenChange={handleUpdateValueModalOpenChange}
      />

      <DeleteInvestmentDialog
        investment={deletingInvestment}
        open={!!deletingInvestment}
        onOpenChange={handleDeleteDialogOpenChange}
      />
    </div>
  );
}
