'use client';

import { useState } from 'react';
import {
  Loader2,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp,
  PiggyBank,
  Heart,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  incomeTypeLabels,
  incomeFrequencyOptions,
  formatCurrency,
  type IncomeType,
  type IncomeFrequency,
} from '../../types';
import { useCreateIncome } from '../../hooks/use-incomes';

// =============================================================================
// Types
// =============================================================================

interface CreateIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthYear: string;
}

interface FormData {
  type: IncomeType | null;
  name: string;
  frequency: IncomeFrequency;
  expectedAmount: number;
  actualAmount: number | null;
  isRecurring: boolean;
}

type Step = 'type' | 'details' | 'confirm';

// =============================================================================
// Type Selection Icons
// =============================================================================

const typeConfig: Record<IncomeType, { icon: typeof Briefcase; color: string; bg: string }> = {
  salary: {
    icon: Briefcase,
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-200 dark:border-green-800',
  },
  freelance: {
    icon: Laptop,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-200 dark:border-blue-800',
  },
  bonus: {
    icon: Gift,
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-200 dark:border-purple-800',
  },
  passive: {
    icon: TrendingUp,
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-200 dark:border-orange-800',
  },
  investment: {
    icon: PiggyBank,
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-200 dark:border-yellow-800',
  },
  gift: {
    icon: Heart,
    color: 'text-pink-700 dark:text-pink-400',
    bg: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-200 dark:border-pink-800',
  },
  other: {
    icon: Package,
    color: 'text-gray-700 dark:text-gray-400',
    bg: 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-200 dark:border-gray-800',
  },
};

// =============================================================================
// Step 1: Type Selection
// =============================================================================

interface TypeSelectionStepProps {
  selectedType: IncomeType | null;
  onSelect: (type: IncomeType) => void;
}

function TypeSelectionStep({ selectedType, onSelect }: TypeSelectionStepProps) {
  const types: IncomeType[] = ['salary', 'freelance', 'bonus', 'passive', 'investment', 'gift', 'other'];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Selecione o tipo de renda que você vai cadastrar
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {types.map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          const isSelected = selectedType === type;

          return (
            <motion.button
              key={type}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(type)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                config.bg,
                isSelected
                  ? 'ring-2 ring-foreground/20 border-foreground/50'
                  : 'border-transparent'
              )}
            >
              <Icon className={cn('h-6 w-6', config.color)} />
              <span className={cn('text-xs font-medium', config.color)}>
                {incomeTypeLabels[type]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Step 2: Details Form
// =============================================================================

interface DetailsStepProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
  errors: Partial<Record<keyof FormData, string>>;
}

function DetailsStep({ data, onChange, errors }: DetailsStepProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="income-name">Nome</Label>
        <Input
          id="income-name"
          placeholder="Ex: Salário da Empresa XYZ"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          data-testid="income-form-name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="income-frequency">Frequência</Label>
        <Select
          value={data.frequency}
          onValueChange={(value) => onChange({ frequency: value as IncomeFrequency })}
        >
          <SelectTrigger data-testid="income-form-frequency">
            <SelectValue placeholder="Selecione a frequência" />
          </SelectTrigger>
          <SelectContent>
            {incomeFrequencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expected Amount */}
      <div className="space-y-2">
        <Label htmlFor="income-expected">Valor Previsto (R$)</Label>
        <Input
          id="income-expected"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={data.expectedAmount || ''}
          onChange={(e) => onChange({ expectedAmount: parseFloat(e.target.value) || 0 })}
          data-testid="income-form-expected-amount"
        />
        {errors.expectedAmount && (
          <p className="text-xs text-destructive">{errors.expectedAmount}</p>
        )}
      </div>

      {/* Is Recurring */}
      <div className="flex items-center justify-between space-x-2 pt-2">
        <div className="space-y-0.5">
          <Label htmlFor="income-recurring" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Renda Recorrente
          </Label>
          <p className="text-xs text-muted-foreground">
            Será copiada automaticamente para os próximos meses
          </p>
        </div>
        <Switch
          id="income-recurring"
          checked={data.isRecurring}
          onCheckedChange={(checked) => onChange({ isRecurring: checked })}
          data-testid="income-form-is-recurring"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Step 3: Confirmation
// =============================================================================

interface ConfirmStepProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

function ConfirmStep({ data, onChange }: ConfirmStepProps) {
  if (!data.type) return null;

  const config = typeConfig[data.type];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className={cn('p-4 rounded-xl border', config.bg)}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-background/50">
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">{data.name || 'Sem nome'}</h4>
            <p className="text-sm text-muted-foreground">
              {incomeTypeLabels[data.type]} · {incomeFrequencyOptions.find(o => o.value === data.frequency)?.label}
            </p>
            <p className="text-lg font-semibold mt-2 tabular-nums">
              {formatCurrency(data.expectedAmount)}
            </p>
            {data.isRecurring && (
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-3 w-3" />
                <span>Recorrente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional: Already received? */}
      <div className="space-y-2 pt-2">
        <Label htmlFor="income-actual-confirm">Já recebeu este mês? (opcional)</Label>
        <Input
          id="income-actual-confirm"
          type="number"
          step="0.01"
          min="0"
          placeholder="Deixe em branco se ainda não recebeu"
          value={data.actualAmount ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ actualAmount: value ? parseFloat(value) : null });
          }}
          data-testid="income-form-actual-amount"
        />
        <p className="text-xs text-muted-foreground">
          Se informar um valor, a renda será marcada como recebida
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Step Indicator
// =============================================================================

interface StepIndicatorProps {
  currentStep: Step;
  steps: { key: Step; label: string }[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                isActive && 'bg-foreground text-background',
                isCompleted && 'bg-emerald-500 text-white',
                !isActive && !isCompleted && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 transition-colors',
                  isCompleted ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * CreateIncomeModal - Step-based modal for creating a new income
 *
 * Steps:
 * 1. Type Selection - Visual icons for income type
 * 2. Details - Name, frequency, amount, recurring toggle
 * 3. Confirmation - Summary + optional actual amount
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateIncomeModal({
  open,
  onOpenChange,
  monthYear,
}: CreateIncomeModalProps) {
  const createIncome = useCreateIncome();

  const [step, setStep] = useState<Step>('type');
  const [formData, setFormData] = useState<FormData>({
    type: null,
    name: '',
    frequency: 'monthly',
    expectedAmount: 0,
    actualAmount: null,
    isRecurring: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const steps: { key: Step; label: string }[] = [
    { key: 'type', label: 'Tipo' },
    { key: 'details', label: 'Dados' },
    { key: 'confirm', label: 'Confirmar' },
  ];

  const resetForm = () => {
    setStep('type');
    setFormData({
      type: null,
      name: '',
      frequency: 'monthly',
      expectedAmount: 0,
      actualAmount: null,
      isRecurring: true,
    });
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete clearedErrors[key as keyof FormData];
    });
    setErrors(clearedErrors);
  };

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 'type') {
      if (!formData.type) {
        toast.error('Selecione um tipo de renda');
        return false;
      }
    }

    if (step === 'details') {
      if (!formData.name.trim()) {
        newErrors.name = 'Nome é obrigatório';
      }
      if (!formData.expectedAmount || formData.expectedAmount <= 0) {
        newErrors.expectedAmount = 'Valor deve ser maior que zero';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (step === 'type') {
      setStep('details');
    } else if (step === 'details') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('type');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  const handleSubmit = async () => {
    if (!formData.type) return;

    try {
      await createIncome.mutateAsync({
        name: formData.name,
        type: formData.type,
        frequency: formData.frequency,
        expectedAmount: formData.expectedAmount,
        actualAmount: formData.actualAmount ?? undefined,
        isRecurring: formData.isRecurring,
        monthYear,
      });

      toast.success('Renda criada com sucesso');
      handleOpenChange(false);
    } catch {
      toast.error('Erro ao criar renda. Tente novamente.');
    }
  };

  const handleTypeSelect = (type: IncomeType) => {
    updateFormData({ type });
    // Auto-advance after selection
    setTimeout(() => setStep('details'), 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="create-income-modal">
        <DialogHeader>
          <DialogTitle>Nova Renda</DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Qual tipo de renda você vai cadastrar?'}
            {step === 'details' && 'Preencha os detalhes da renda'}
            {step === 'confirm' && 'Confirme as informações'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} steps={steps} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'type' && (
              <TypeSelectionStep
                selectedType={formData.type}
                onSelect={handleTypeSelect}
              />
            )}
            {step === 'details' && (
              <DetailsStep
                data={formData}
                onChange={updateFormData}
                errors={errors}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                data={formData}
                onChange={updateFormData}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {step !== 'type' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={createIncome.isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createIncome.isPending}
            >
              Cancelar
            </Button>
            {step !== 'confirm' ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={step === 'type' && !formData.type}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createIncome.isPending}
              >
                {createIncome.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Criar Renda
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
