'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCreateTrackingEntry } from '../hooks/use-tracking';
import { useCustomMetrics } from '../hooks/use-custom-metrics';
import {
  type TrackingType,
  type LifeArea,
  type CustomMetricDefinition,
  trackingTypeLabels,
  trackingTypeIcons,
  defaultUnits,
  validationRules,
} from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Discriminated union for metric selection
 * Either a built-in type or a custom metric definition
 */
type MetricSelection =
  | { kind: 'builtin'; type: TrackingType }
  | { kind: 'custom'; metric: CustomMetricDefinition };

interface FormData {
  value: string;
  unit: string;
  entryDate: string;
  entryTime: string;
}

interface ManualTrackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TrackingType;
  /** Default date for the entry (YYYY-MM-DD format). If provided, pre-fills the date field. */
  defaultDate?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Built-in tracking types (excludes 'custom' which is used for custom metrics) */
const BUILTIN_TYPES: TrackingType[] = [
  'weight',
  'water',
  'sleep',
  'exercise',
  'mood',
  'energy',
];

/** Map tracking type to life area (ADR-017) */
const areaMap: Record<TrackingType, LifeArea> = {
  weight: 'health',
  water: 'health',
  sleep: 'health',
  exercise: 'health',
  mood: 'health',
  energy: 'health',
  custom: 'learning', // Default for custom, will be overridden by metric.area
};

/** Color palette for built-in metric types */
const metricColors: Record<TrackingType, { bg: string; border: string; text: string }> = {
  weight: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-600 dark:text-blue-400',
  },
  water: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-600 dark:text-cyan-400',
  },
  sleep: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  exercise: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  mood: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-600 dark:text-amber-400',
  },
  energy: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-600 dark:text-orange-400',
  },
  custom: {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
  },
};

// =============================================================================
// MetricChip Component
// =============================================================================

interface MetricChipProps {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string | null;
  colorClasses?: { bg: string; border: string; text: string };
}

function MetricChip({
  icon,
  label,
  selected,
  onClick,
  color,
  colorClasses,
}: MetricChipProps) {
  // Use custom color if provided and selected, otherwise use colorClasses
  const customStyle = selected && color
    ? {
        backgroundColor: `${color}15`,
        borderColor: color,
        color: color,
      }
    : undefined;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 min-w-[72px] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
        selected && !color && colorClasses
          ? cn(colorClasses.bg, colorClasses.border, colorClasses.text)
          : selected
            ? ''
            : 'border-border hover:border-muted-foreground/50 bg-transparent'
      )}
      style={customStyle}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium truncate max-w-[60px]">{label}</span>
    </motion.button>
  );
}

// =============================================================================
// ManualTrackForm Component
// =============================================================================

/**
 * Manual tracking entry form with chip-based metric selection
 *
 * @see docs/specs/domains/tracking.md §4.2 for custom metrics integration
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export function ManualTrackForm({
  open,
  onOpenChange,
  defaultType = 'weight',
  defaultDate,
}: ManualTrackFormProps) {
  const createEntry = useCreateTrackingEntry();
  const { data: customMetrics, isLoading: isLoadingCustomMetrics } = useCustomMetrics();

  // Selection state: built-in type or custom metric
  const [selection, setSelection] = useState<MetricSelection>({
    kind: 'builtin',
    type: defaultType,
  });

  // Derive validation rules, unit, and label from selection
  const { rules, unit, label } = useMemo(() => {
    if (selection.kind === 'builtin') {
      return {
        rules: validationRules[selection.type],
        unit: defaultUnits[selection.type],
        label: trackingTypeLabels[selection.type],
      };
    } else {
      const metric = selection.metric;
      return {
        rules: {
          min: metric.minValue ? parseFloat(metric.minValue) : undefined,
          max: metric.maxValue ? parseFloat(metric.maxValue) : undefined,
          step: 0.1,
        },
        unit: metric.unit,
        label: metric.name,
      };
    }
  }, [selection]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      value: '',
      unit: unit,
      entryDate: defaultDate || new Date().toISOString().split('T')[0],
      entryTime: '',
    },
  });

  // Update entryDate when defaultDate changes
  useEffect(() => {
    if (defaultDate) {
      setValue('entryDate', defaultDate);
    }
  }, [defaultDate, setValue]);

  // Update unit when selection changes
  useEffect(() => {
    setValue('unit', unit);
  }, [unit, setValue]);

  // Handle dialog open/close with selection reset
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset selection when closing
      setSelection({ kind: 'builtin', type: defaultType });
    }
    onOpenChange(isOpen);
  };

  const handleSelectBuiltin = (type: TrackingType) => {
    setSelection({ kind: 'builtin', type });
  };

  const handleSelectCustom = (metric: CustomMetricDefinition) => {
    setSelection({ kind: 'custom', metric });
  };

  const onSubmit = async (data: FormData) => {
    const value = parseFloat(data.value);
    if (isNaN(value) || value <= 0) {
      toast.error('Valor invalido.');
      return;
    }

    // Validate against rules
    if (rules.min !== undefined && value < rules.min) {
      toast.error(`Valor minimo: ${rules.min}`);
      return;
    }
    if (rules.max !== undefined && value > rules.max) {
      toast.error(`Valor maximo: ${rules.max}`);
      return;
    }

    try {
      const isCustom = selection.kind === 'custom';

      // Combine date and time into ISO 8601 if time is provided
      let entryTime: string | undefined;
      if (data.entryTime) {
        entryTime = `${data.entryDate}T${data.entryTime}:00`;
      }

      await createEntry.mutateAsync({
        type: isCustom ? 'custom' : selection.type,
        area: isCustom ? selection.metric.area : areaMap[selection.type],
        value,
        unit: data.unit || unit,
        entryDate: data.entryDate,
        entryTime,
        source: 'form',
        metadata: isCustom ? { customMetricId: selection.metric.id } : undefined,
      });

      toast.success(`${label}: ${value} ${data.unit || unit}`);

      onOpenChange(false);
      reset();
    } catch {
      toast.error('Erro ao salvar. Tente novamente em alguns instantes.');
    }
  };

  const hasCustomMetrics = customMetrics && customMetrics.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Metrica</DialogTitle>
          <DialogDescription>
            Selecione a metrica e registre o valor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Metric Type Selection - Chips */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Tipo de Metrica
            </Label>

            {/* Built-in metrics */}
            <div className="flex flex-wrap gap-2">
              {BUILTIN_TYPES.map((type) => {
                const Icon = trackingTypeIcons[type];
                const isSelected = selection.kind === 'builtin' && selection.type === type;

                return (
                  <MetricChip
                    key={type}
                    icon={<Icon className="h-5 w-5" />}
                    label={trackingTypeLabels[type]}
                    selected={isSelected}
                    onClick={() => handleSelectBuiltin(type)}
                    colorClasses={metricColors[type]}
                  />
                );
              })}
            </div>

            {/* Custom metrics section */}
            {(hasCustomMetrics || isLoadingCustomMetrics) && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Minhas Metricas
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {isLoadingCustomMetrics ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customMetrics?.map((metric) => {
                      const isSelected =
                        selection.kind === 'custom' && selection.metric.id === metric.id;

                      return (
                        <MetricChip
                          key={metric.id}
                          icon={<span>{metric.icon}</span>}
                          label={metric.name}
                          selected={isSelected}
                          onClick={() => handleSelectCustom(metric)}
                          color={metric.color}
                          colorClasses={metricColors.custom}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Value input */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <div className="flex gap-2">
              <Input
                id="value"
                type="number"
                step={rules.step ?? 0.1}
                min={rules.min}
                max={rules.max}
                placeholder={`Ex: ${rules.min ?? 0}`}
                className="flex-1"
                {...register('value', { required: 'Valor obrigatorio' })}
              />
              <Input
                id="unit"
                className="w-24"
                placeholder={unit}
                {...register('unit')}
              />
            </div>
            {rules.min !== undefined && rules.max !== undefined && (
              <p className="text-xs text-muted-foreground">
                Entre {rules.min} e {rules.max} {unit}
              </p>
            )}
            {errors.value && (
              <p className="text-xs text-destructive">
                {errors.value.message}
              </p>
            )}
          </div>

          {/* Date and Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Data
              </Label>
              <Input
                id="entryDate"
                type="date"
                {...register('entryDate', { required: 'Data obrigatoria' })}
              />
              {errors.entryDate && (
                <p className="text-xs text-destructive">
                  {errors.entryDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryTime" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Hora <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="entryTime"
                type="time"
                {...register('entryTime')}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
