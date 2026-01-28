/**
 * Bill Components
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */

// Core components
export { BillCard } from './bill-card';
export { BillList } from './bill-list';
export { BillSummary } from './bill-summary';
export { BillForm, type BillFormData } from './bill-form';

// Modals and dialogs
export { CreateBillModal } from './create-bill-modal';
export { EditBillModal } from './edit-bill-modal';
export { DeleteBillDialog } from './delete-bill-dialog';

// New enhanced components
export { BillHeader, type BillStatusFilter } from './bill-header';
export { BillAlerts, BillAlertBanner } from './bill-alerts';
export { BillEmptyState, BillSectionEmptyState, type BillEmptyStateType } from './bill-empty-states';
export { BillQuickPay, QuickPayTrigger } from './bill-quick-pay';

// Mobile components
export {
  FAB,
  ScrollToTop,
  BottomSheet,
  BillActionsSheet,
  PullToRefresh,
  MobileCardActions,
} from './bill-mobile-components';

// Animation components
export {
  FadeInUp,
  ScaleIn,
  StaggerList,
  StaggerItem,
  AnimatedProgressBar,
  AnimatedNumber,
  Pulse,
  ShimmerSkeleton,
  BillCardSkeleton,
  BillSummarySkeleton,
  LoadingOverlay,
  SuccessCheckmark,
  HoverCard,
  CelebrationConfetti,
  // Animation variants
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInFromRight,
  staggerContainer,
  staggerItem,
} from './bill-animations';
