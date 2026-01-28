/**
 * Income Components
 *
 * Redesigned components for the income management page.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */

// Core Components
export { IncomeCard } from './income-card';
export { IncomeList } from './income-list';
export { IncomeSummary } from './income-summary';
export { IncomeHeader, type IncomeStatusFilter } from './income-header';

// Form & Modals
export { IncomeForm, type IncomeFormData } from './income-form';
export { CreateIncomeModal } from './create-income-modal';
export { EditIncomeModal } from './edit-income-modal';
export { DeleteIncomeDialog } from './delete-income-dialog';
export { IncomeQuickRegister } from './income-quick-register';

// Empty States
export {
  IncomeEmptyState,
  IncomeSectionEmptyState,
  type IncomeEmptyStateType,
} from './income-empty-states';
