// Debt Components Barrel Export
// @see docs/milestones/phase-2-tracker.md M2.2

// Core Components
export { DebtProgressBar } from './debt-progress-bar';
export { DebtStats } from './debt-stats';
export { DebtCard } from './debt-card';
export { DebtList } from './debt-list';
export { DebtSummary } from './debt-summary';
export { DebtForm, type DebtFormData } from './debt-form';

// Modals and Dialogs
export { CreateDebtModal } from './create-debt-modal';
export { EditDebtModal } from './edit-debt-modal';
export { DeleteDebtDialog } from './delete-debt-dialog';
export { NegotiateDebtModal } from './negotiate-debt-modal';
export { PayInstallmentDialog } from './pay-installment-dialog';

// New UX Components
export { DebtHeader } from './debt-header';
export { DebtAlerts } from './debt-alerts';
export { DebtEmptyState, SectionEmptyState } from './debt-empty-states';
export { DebtSimulator } from './debt-simulator';
export { DebtFocusMode, FocusModeTrigger } from './debt-focus-mode';
export { DebtPaymentHistory } from './debt-payment-history';

// Mobile Components
export {
  BottomSheet,
  DebtActionsSheet,
  FAB,
  ExpandableFAB,
  ScrollToTop,
  PullToRefresh,
  MobileCardActions,
} from './debt-mobile-components';

// Animation Components
export {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInFromRight,
  staggerContainer,
  staggerItem,
  FadeInUp,
  ScaleIn,
  StaggerList,
  StaggerItem,
  AnimatedProgressBar,
  AnimatedNumber,
  Pulse,
  ShimmerSkeleton,
  DebtCardSkeleton,
  DebtSummarySkeleton,
  LoadingOverlay,
  SuccessCheckmark,
} from './debt-animations';
