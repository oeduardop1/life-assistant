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
import { useUpdateCustomMetric } from '../../hooks';
import type { CustomMetricDefinition, LifeArea } from '../../types';

interface EditCustomMetricModalProps {
  metric: CustomMetricDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for editing an existing custom metric definition
 */
export function EditCustomMetricModal({
  metric,
  open,
  onOpenChange,
}: EditCustomMetricModalProps) {
  const updateMutation = useUpdateCustomMetric();

  if (!metric) return null;

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
    updateMutation.mutate(
      {
        metricId: metric.id,
        data: {
          name: values.name,
          description: values.description,
          icon: values.icon,
          color: values.color,
          unit: values.unit,
          minValue: values.minValue ?? null,
          maxValue: values.maxValue ?? null,
          area: values.area,
        },
      },
      {
        onSuccess: (updatedMetric) => {
          toast.success(`"${updatedMetric.name}" foi atualizada com sucesso.`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Erro ao atualizar métrica. Tente novamente.');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Métrica</DialogTitle>
          <DialogDescription>
            Altere as configurações da métrica &quot;{metric.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <CustomMetricForm
          defaultValues={{
            name: metric.name,
            description: metric.description ?? '',
            icon: metric.icon,
            color: metric.color ?? '',
            unit: metric.unit,
            minValue: metric.minValue ?? '',
            maxValue: metric.maxValue ?? '',
            area: metric.area,
          }}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          submitLabel="Salvar Alterações"
        />
      </DialogContent>
    </Dialog>
  );
}
