'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateBill } from '../../hooks/use-bills';
import { BillForm, type BillFormData } from './bill-form';

// =============================================================================
// Props
// =============================================================================

interface CreateBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthYear: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateBillModal - Modal for creating a new bill
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateBillModal({
  open,
  onOpenChange,
  monthYear,
}: CreateBillModalProps) {
  const createBill = useCreateBill();

  const handleSubmit = async (data: BillFormData) => {
    try {
      await createBill.mutateAsync({
        name: data.name,
        category: data.category,
        amount: data.amount,
        dueDay: data.dueDay,
        isRecurring: data.isRecurring,
        monthYear,
      });

      toast.success('Conta criada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-bill-modal">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
          <DialogDescription>
            Adicione uma nova conta fixa para este mês.
          </DialogDescription>
        </DialogHeader>

        <BillForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createBill.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
