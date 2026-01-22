'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvestmentForm, type InvestmentFormData } from './investment-form';
import { useCreateInvestment } from '../../hooks/use-investments';
import type { CreateInvestmentInput } from '../../types';

interface CreateInvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for creating a new investment
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateInvestmentModal({
  open,
  onOpenChange,
}: CreateInvestmentModalProps) {
  const { mutate: createInvestment, isPending } = useCreateInvestment();

  const handleSubmit = (data: InvestmentFormData) => {
    const input: CreateInvestmentInput = {
      name: data.name,
      type: data.type,
      currentAmount: data.currentAmount,
      goalAmount: data.goalAmount || undefined,
      monthlyContribution: data.monthlyContribution || undefined,
      deadline: data.deadline || undefined,
    };

    createInvestment(input, {
      onSuccess: () => {
        toast.success('Investimento criado com sucesso!');
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error('Erro ao criar investimento', {
          description: error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-investment-modal">
        <DialogHeader>
          <DialogTitle>Novo Investimento</DialogTitle>
        </DialogHeader>
        <InvestmentForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
