'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateDebt } from '../../hooks/use-debts';
import { DebtForm, type DebtFormData } from './debt-form';

// =============================================================================
// Props
// =============================================================================

interface CreateDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateDebtModal - Modal for creating a new debt
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateDebtModal({
  open,
  onOpenChange,
}: CreateDebtModalProps) {
  const createDebt = useCreateDebt();

  const handleSubmit = async (data: DebtFormData) => {
    try {
      await createDebt.mutateAsync({
        name: data.name,
        creditor: data.creditor || undefined,
        totalAmount: data.totalAmount,
        isNegotiated: data.isNegotiated,
        totalInstallments: data.isNegotiated ? data.totalInstallments : undefined,
        installmentAmount: data.isNegotiated ? data.installmentAmount : undefined,
        dueDay: data.isNegotiated ? data.dueDay : undefined,
        notes: data.notes || undefined,
      });

      toast.success('Dívida criada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar dívida. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="create-debt-modal">
        <DialogHeader>
          <DialogTitle>Nova Dívida</DialogTitle>
          <DialogDescription>
            Adicione uma nova dívida para controle financeiro.
          </DialogDescription>
        </DialogHeader>

        <DebtForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createDebt.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
