'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvestmentForm, type InvestmentFormData } from './investment-form';
import { useUpdateInvestment } from '../../hooks/use-investments';
import type { Investment, UpdateInvestmentInput } from '../../types';

interface EditInvestmentModalProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for editing an existing investment
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditInvestmentModal({
  investment,
  open,
  onOpenChange,
}: EditInvestmentModalProps) {
  const { mutate: updateInvestment, isPending } = useUpdateInvestment();

  if (!investment) return null;

  const defaultValues: Partial<InvestmentFormData> = {
    name: investment.name,
    type: investment.type,
    currentAmount: parseFloat(investment.currentAmount) || 0,
    goalAmount: investment.goalAmount ? parseFloat(investment.goalAmount) : undefined,
    monthlyContribution: investment.monthlyContribution
      ? parseFloat(investment.monthlyContribution)
      : undefined,
    deadline: investment.deadline || undefined,
  };

  const handleSubmit = (data: InvestmentFormData) => {
    const input: UpdateInvestmentInput = {
      name: data.name,
      type: data.type,
      currentAmount: data.currentAmount,
      goalAmount: data.goalAmount || undefined,
      monthlyContribution: data.monthlyContribution || undefined,
      deadline: data.deadline || undefined,
    };

    updateInvestment(
      { id: investment.id, data: input },
      {
        onSuccess: () => {
          toast.success('Investimento atualizado com sucesso!');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Erro ao atualizar investimento', {
            description: error.message,
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="edit-investment-modal">
        <DialogHeader>
          <DialogTitle>Editar Investimento</DialogTitle>
        </DialogHeader>
        <InvestmentForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
