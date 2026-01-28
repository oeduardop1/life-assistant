'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Drawer } from 'vaul';
import {
  Plus,
  CreditCard,
  Edit3,
  Trash2,
  Calculator,
  Eye,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

interface ActionItem {
  id: string;
  label: string;
  icon: typeof CreditCard;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success';
  disabled?: boolean;
}

// =============================================================================
// Bottom Sheet Component
// =============================================================================

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  actions?: ActionItem[];
}

const variantStyles = {
  default: 'text-foreground hover:bg-muted',
  destructive: 'text-destructive hover:bg-destructive/10',
  success: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
};

/**
 * BottomSheet - Mobile-friendly action sheet using vaul
 *
 * Features:
 * - Smooth drag-to-dismiss
 * - Touch-friendly action buttons
 * - Visual feedback on interaction
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl bg-background">
          {/* Handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />

          {/* Header */}
          {(title || description) && (
            <div className="px-6 pt-4 pb-2">
              {title && (
                <Drawer.Title className="text-lg font-semibold">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground mt-1">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="px-4 py-4 space-y-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick();
                    onOpenChange(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors',
                    variantStyles[action.variant || 'default'],
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-base font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom Content */}
          {children && <div className="px-6 pb-6">{children}</div>}

          {/* Cancel Button */}
          <div className="px-4 pb-8">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 text-base"
            >
              Cancelar
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// =============================================================================
// Debt Actions Bottom Sheet
// =============================================================================

interface DebtActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtName: string;
  isNegotiated: boolean;
  isPaidOff: boolean;
  onPay?: () => void;
  onNegotiate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
}

/**
 * DebtActionsSheet - Pre-configured bottom sheet for debt actions
 */
export function DebtActionsSheet({
  open,
  onOpenChange,
  debtName,
  isNegotiated,
  isPaidOff,
  onPay,
  onNegotiate,
  onEdit,
  onDelete,
  onViewDetails,
}: DebtActionsSheetProps) {
  const actions: ActionItem[] = [];

  if (isNegotiated && !isPaidOff && onPay) {
    actions.push({
      id: 'pay',
      label: 'Pagar Parcela',
      icon: CreditCard,
      onClick: onPay,
      variant: 'success',
    });
  }

  if (!isNegotiated && onNegotiate) {
    actions.push({
      id: 'negotiate',
      label: 'Negociar Dívida',
      icon: Calculator,
      onClick: onNegotiate,
      variant: 'success',
    });
  }

  if (onViewDetails) {
    actions.push({
      id: 'view',
      label: 'Ver Detalhes',
      icon: Eye,
      onClick: onViewDetails,
    });
  }

  if (onEdit) {
    actions.push({
      id: 'edit',
      label: 'Editar',
      icon: Edit3,
      onClick: onEdit,
    });
  }

  if (onDelete) {
    actions.push({
      id: 'delete',
      label: 'Excluir',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={debtName}
      description="Escolha uma ação"
      actions={actions}
    />
  );
}

// =============================================================================
// Floating Action Button
// =============================================================================

interface FABProps {
  onClick: () => void;
  icon?: typeof Plus;
  label?: string;
  className?: string;
}

/**
 * FAB - Floating Action Button that hides on scroll down
 *
 * Features:
 * - Auto-hide on scroll down
 * - Show on scroll up
 * - Smooth spring animation
 * - Optional label expansion
 */
export function FAB({ onClick, icon: Icon = Plus, label, className }: FABProps) {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const direction = latest > lastScrollY ? 'down' : 'up';

    if (direction === 'down' && latest > 100) {
      setVisible(false);
    } else {
      setVisible(true);
    }

    setLastScrollY(latest);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={cn(
            'fixed bottom-6 right-6 z-40',
            'flex items-center gap-2 px-5 py-4',
            'bg-foreground text-background',
            'rounded-full shadow-lg shadow-foreground/20',
            'transition-colors',
            className
          )}
        >
          <Icon className="h-5 w-5" />
          {label && (
            <span className="text-sm font-medium pr-1">{label}</span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Expandable FAB with Actions
// =============================================================================

interface FABAction {
  id: string;
  label: string;
  icon: typeof Plus;
  onClick: () => void;
}

interface ExpandableFABProps {
  actions: FABAction[];
  className?: string;
}

/**
 * ExpandableFAB - FAB that expands to show multiple actions
 */
export function ExpandableFAB({ actions, className }: ExpandableFABProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const direction = latest > lastScrollY ? 'down' : 'up';

    if (direction === 'down' && latest > 100) {
      setVisible(false);
      setExpanded(false);
    } else {
      setVisible(true);
    }

    setLastScrollY(latest);
  });

  return (
    <AnimatePresence>
      {visible && (
        <div className={cn('fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3', className)}>
          {/* Expanded Actions */}
          <AnimatePresence>
            {expanded && (
              <>
                {actions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0, opacity: 0, y: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      action.onClick();
                      setExpanded(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3',
                      'bg-background border border-border',
                      'rounded-full shadow-lg',
                      'hover:bg-muted transition-colors'
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: expanded ? 45 : 0 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center justify-center w-14 h-14',
              'bg-foreground text-background',
              'rounded-full shadow-lg shadow-foreground/20'
            )}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Scroll to Top Button
// =============================================================================

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

/**
 * ScrollToTop - Button that appears after scrolling down
 */
export function ScrollToTop({ threshold = 400, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setVisible(latest > threshold);
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 left-6 z-40',
            'flex items-center justify-center w-10 h-10',
            'bg-muted hover:bg-muted/80',
            'rounded-full shadow-md',
            'transition-colors',
            className
          )}
        >
          <ChevronUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Pull to Refresh Indicator
// =============================================================================

interface PullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

/**
 * PullToRefresh - Pull to refresh wrapper for mobile
 */
export function PullToRefresh({ refreshing, onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = () => {
    if (window.scrollY === 0) {
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling) return;
    const touch = e.touches[0];
    const distance = Math.max(0, touch.clientY - 100);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      await onRefresh();
    }
    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <AnimatePresence>
        {(pulling || refreshing) && pullDistance > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: pullDistance }}
            exit={{ height: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 3.6 }}
              transition={refreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}

// =============================================================================
// Mobile Card Actions Overlay
// =============================================================================

interface MobileCardActionsProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * MobileCardActions - Overlay for card actions on mobile
 */
export function MobileCardActions({ visible, onClose, children }: MobileCardActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex gap-3"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
