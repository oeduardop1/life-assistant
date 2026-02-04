'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomMetricForm } from './custom-metric-form';
import { useCreateCustomMetric } from '../../hooks';
import type { LifeArea } from '../../types';

interface CreateCustomMetricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for creating a new custom metric definition
 */
export function CreateCustomMetricModal({
  open,
  onOpenChange,
}: CreateCustomMetricModalProps) {
  const createMutation = useCreateCustomMetric();

  const handleSubmit = (values: {
    name: string;
    description?: string;
    icon: string;
    color?: string;
    unit: string;
    minValue?: number;
    maxValue?: number;
    area: LifeArea;
  }) => {
    createMutation.mutate(
      {
        name: values.name,
        description: values.description,
        icon: values.icon,
        color: values.color,
        unit: values.unit,
        minValue: values.minValue,
        maxValue: values.maxValue,
        area: values.area,
      },
      {
        onSuccess: (metric) => {
          toast.success(`"${metric.name}" foi criada com sucesso.`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Erro ao criar métrica. Tente novamente.');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Métrica Personalizada</DialogTitle>
          <DialogDescription>
            Crie uma métrica personalizada para rastrear qualquer valor numérico.
          </DialogDescription>
        </DialogHeader>
        <CustomMetricForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          submitLabel="Criar Métrica"
        />
      </DialogContent>
    </Dialog>
  );
}
