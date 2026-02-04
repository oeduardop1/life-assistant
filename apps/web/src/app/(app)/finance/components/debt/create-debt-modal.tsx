'use client';

import { useState, useCallback } from 'react';
import { useForm, useWatch, Control } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CreditCard,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCreateDebt } from '../../hooks/use-debts';
import { MonthPicker } from '../month-picker';
import {
  getCurrentMonthInTimezone,
  formatMonthDisplay,
  calculateDebtEndMonth,
  formatCurrency,
} from '../../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

// =============================================================================
// Types
// =============================================================================

interface FormData {
  name: string;
  creditor: string;
  totalAmount: number;
  isNegotiated: boolean;
  totalInstallments: number;
  installmentAmount: number;
  dueDay: number;
  startMonthYear: string;
  notes: string;
}

interface CreateDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'type' | 'info' | 'terms' | 'review';

// =============================================================================
// Step Indicator
// =============================================================================

interface StepIndicatorProps {
  steps: { key: Step; label: string }[];
  currentStep: Step;
  isNegotiated: boolean;
}

function StepIndicator({ steps, currentStep, isNegotiated }: StepIndicatorProps) {
  const visibleSteps = isNegotiated
    ? steps
    : steps.filter((s) => s.key !== 'terms');

  const currentIndex = visibleSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {visibleSteps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors',
              index < currentIndex && 'bg-foreground text-background',
              index === currentIndex && 'bg-foreground text-background ring-2 ring-foreground/20',
              index > currentIndex && 'bg-muted text-muted-foreground'
            )}
          >
            {index < currentIndex ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              index + 1
            )}
          </div>
          {index < visibleSteps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 transition-colors',
                index < currentIndex ? 'bg-foreground' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Step 1: Type Selection
// =============================================================================

interface TypeStepProps {
  value: boolean;
  onChange: (value: boolean) => void;
  onNext: () => void;
}

function TypeStep({ value, onChange, onNext }: TypeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Qual o tipo da dívida?</h3>
        <p className="text-sm text-muted-foreground">
          Escolha se a dívida já possui condições de pagamento definidas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            onChange(true);
            onNext();
          }}
          className={cn(
            'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
            'hover:border-foreground/50 hover:bg-accent/50',
            value && 'border-foreground bg-accent/50'
          )}
        >
          <div className="p-3 rounded-full bg-foreground/10">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="font-medium">Negociada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Já sei as condições de pagamento
            </p>
          </div>
          {value && (
            <div className="absolute top-3 right-3">
              <Check className="h-4 w-4 text-foreground" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onChange(false);
            onNext();
          }}
          className={cn(
            'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
            'hover:border-foreground/50 hover:bg-accent/50',
            !value && 'border-foreground bg-accent/50'
          )}
        >
          <div className="p-3 rounded-full bg-amber-500/10">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="text-center">
            <p className="font-medium">Pendente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ainda não negociei as condições
            </p>
          </div>
          {!value && (
            <div className="absolute top-3 right-3">
              <Check className="h-4 w-4 text-foreground" />
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Step 2: Basic Info
// =============================================================================

interface InfoStepProps {
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
}

function InfoStep({ register, errors, onBack, onNext, isValid }: InfoStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Dados da Dívida</h3>
        <p className="text-sm text-muted-foreground">
          Informe os dados básicos da dívida
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Dívida *</Label>
          <Input
            id="name"
            placeholder="Ex: Financiamento Carro, Empréstimo..."
            {...register('name', { required: 'Nome é obrigatório' })}
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="creditor">Credor (opcional)</Label>
          <Input
            id="creditor"
            placeholder="Ex: Banco XYZ, Financeira ABC..."
            {...register('creditor')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalAmount">Valor Total *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="pl-10"
              {...register('totalAmount', {
                required: 'Valor é obrigatório',
                valueAsNumber: true,
                min: { value: 0.01, message: 'Valor deve ser maior que zero' },
              })}
            />
          </div>
          {errors.totalAmount && (
            <p className="text-xs text-destructive">{errors.totalAmount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Informações adicionais..."
            rows={2}
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button type="button" onClick={onNext} disabled={!isValid}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Step 3: Payment Terms (Negotiated only)
// =============================================================================

interface TermsStepProps {
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  control: Control<FormData>;
  setValue: ReturnType<typeof useForm<FormData>>['setValue'];
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
  currentMonth: string;
}

function TermsStep({
  register,
  errors,
  control,
  setValue,
  onBack,
  onNext,
  isValid,
  currentMonth,
}: TermsStepProps) {
  const totalAmount = useWatch({ control, name: 'totalAmount' }) || 0;
  const totalInstallments = useWatch({ control, name: 'totalInstallments' }) || 0;
  const installmentAmount = useWatch({ control, name: 'installmentAmount' }) || 0;
  const startMonthYear = useWatch({ control, name: 'startMonthYear' }) || currentMonth;

  const totalWithInstallments = totalInstallments * installmentAmount;
  const difference = totalWithInstallments - totalAmount;
  const percentDiff = totalAmount > 0 ? (difference / totalAmount) * 100 : 0;

  const endMonth =
    totalInstallments > 0
      ? calculateDebtEndMonth(startMonthYear, totalInstallments)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Condições de Pagamento</h3>
        <p className="text-sm text-muted-foreground">
          Defina os detalhes do parcelamento
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalInstallments">Parcelas *</Label>
            <Input
              id="totalInstallments"
              type="number"
              min="1"
              placeholder="12"
              {...register('totalInstallments', {
                required: 'Obrigatório',
                valueAsNumber: true,
                min: { value: 1, message: 'Mínimo 1' },
              })}
            />
            {errors.totalInstallments && (
              <p className="text-xs text-destructive">
                {errors.totalInstallments.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="installmentAmount">Valor/Parcela *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="installmentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="pl-10"
                {...register('installmentAmount', {
                  required: 'Obrigatório',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Mínimo R$ 0,01' },
                })}
              />
            </div>
            {errors.installmentAmount && (
              <p className="text-xs text-destructive">
                {errors.installmentAmount.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDay">Dia de Vencimento *</Label>
          <Input
            id="dueDay"
            type="number"
            min="1"
            max="31"
            placeholder="10"
            {...register('dueDay', {
              required: 'Obrigatório',
              valueAsNumber: true,
              min: { value: 1, message: 'Entre 1-31' },
              max: { value: 31, message: 'Entre 1-31' },
            })}
          />
          {errors.dueDay && (
            <p className="text-xs text-destructive">{errors.dueDay.message}</p>
          )}
        </div>

        <MonthPicker
          value={startMonthYear}
          onChange={(month) => setValue('startMonthYear', month)}
          label="Primeiro Pagamento"
        />

        {/* Summary Card */}
        {totalInstallments > 0 && installmentAmount > 0 && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total das parcelas:</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(totalWithInstallments)}
              </span>
            </div>
            {difference !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {difference > 0 ? 'Juros/Taxas:' : 'Desconto:'}
                </span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    difference > 0
                      ? 'text-amber-600 dark:text-amber-500'
                      : 'text-emerald-600 dark:text-emerald-500'
                  )}
                >
                  {difference > 0 ? '+' : ''}
                  {formatCurrency(difference)} ({percentDiff.toFixed(1)}%)
                </span>
              </div>
            )}
            {endMonth && (
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Última parcela:</span>
                <span className="font-medium">{formatMonthDisplay(endMonth)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button type="button" onClick={onNext} disabled={!isValid}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Step 4: Review
// =============================================================================

interface ReviewStepProps {
  control: Control<FormData>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  currentMonth: string;
}

function ReviewStep({ control, onBack, onSubmit, isSubmitting, currentMonth }: ReviewStepProps) {
  const data = useWatch({ control });
  const totalInstallments = data.totalInstallments ?? 0;
  const totalAmount = data.totalAmount ?? 0;

  const endMonth =
    data.isNegotiated && totalInstallments > 0
      ? calculateDebtEndMonth(
          data.startMonthYear || currentMonth,
          totalInstallments
        )
      : null;

  const totalWithInstallments =
    data.isNegotiated && totalInstallments && data.installmentAmount
      ? totalInstallments * data.installmentAmount
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Confirmar Dívida</h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados antes de salvar
        </p>
      </div>

      <div className="p-4 rounded-lg border bg-card space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold">{data.name || 'Sem nome'}</h4>
            {data.creditor && (
              <p className="text-sm text-muted-foreground">{data.creditor}</p>
            )}
          </div>
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              data.isNegotiated
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            )}
          >
            {data.isNegotiated ? 'Negociada' : 'Pendente'}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
          <div>
            <span className="text-xs text-muted-foreground">Valor Total</span>
            <p className="font-semibold tabular-nums">
              {formatCurrency(data.totalAmount || 0)}
            </p>
          </div>

          {data.isNegotiated && (
            <>
              <div>
                <span className="text-xs text-muted-foreground">Parcelas</span>
                <p className="font-semibold">
                  {data.totalInstallments || 0}x de{' '}
                  {formatCurrency(data.installmentAmount || 0)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Vencimento</span>
                <p className="font-semibold">Dia {data.dueDay || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Período</span>
                <p className="text-sm">
                  {formatMonthDisplay(data.startMonthYear || currentMonth)} →{' '}
                  {endMonth ? formatMonthDisplay(endMonth) : '-'}
                </p>
              </div>
              {totalWithInstallments > totalAmount && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Total com Juros
                  </span>
                  <p className="font-semibold tabular-nums text-amber-600 dark:text-amber-500">
                    {formatCurrency(totalWithInstallments)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {data.notes && (
          <div className="pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Observações</span>
            <p className="text-sm">{data.notes}</p>
          </div>
        )}

        {!data.isNegotiated && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Esta dívida ficará pendente de negociação. Você poderá definir as
              condições de pagamento depois.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Criar Dívida
        </Button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

const STEPS: { key: Step; label: string }[] = [
  { key: 'type', label: 'Tipo' },
  { key: 'info', label: 'Dados' },
  { key: 'terms', label: 'Condições' },
  { key: 'review', label: 'Revisão' },
];

/**
 * CreateDebtModal - Multi-step modal for creating a new debt
 *
 * Steps:
 * 1. Type selection (negotiated vs pending)
 * 2. Basic info (name, creditor, amount)
 * 3. Payment terms (if negotiated)
 * 4. Review and confirm
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function CreateDebtModal({ open, onOpenChange }: CreateDebtModalProps) {
  const [step, setStep] = useState<Step>('type');
  const createDebt = useCreateDebt();
  const timezone = useUserTimezone();
  const currentMonth = getCurrentMonthInTimezone(timezone);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      creditor: '',
      totalAmount: 0,
      isNegotiated: true,
      totalInstallments: 12,
      installmentAmount: 0,
      dueDay: 10,
      startMonthYear: currentMonth,
      notes: '',
    },
    mode: 'onChange',
  });

  const { register, control, setValue, formState, trigger, reset, getValues } = form;
  const isNegotiated = useWatch({ control, name: 'isNegotiated' });

  // Reset form when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setTimeout(() => {
          reset();
          setStep('type');
        }, 200);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset]
  );

  const handleSubmit = async () => {
    const data = getValues();

    try {
      await createDebt.mutateAsync({
        name: data.name,
        creditor: data.creditor || undefined,
        totalAmount: data.totalAmount,
        isNegotiated: data.isNegotiated,
        totalInstallments: data.isNegotiated ? data.totalInstallments : undefined,
        installmentAmount: data.isNegotiated ? data.installmentAmount : undefined,
        dueDay: data.isNegotiated ? data.dueDay : undefined,
        startMonthYear: data.isNegotiated ? data.startMonthYear : undefined,
        notes: data.notes || undefined,
      });

      toast.success('Dívida criada com sucesso');
      handleOpenChange(false);
    } catch {
      toast.error('Erro ao criar dívida. Tente novamente.');
    }
  };

  const goToStep = async (targetStep: Step) => {
    // Validate current step before proceeding
    if (step === 'info') {
      const valid = await trigger(['name', 'totalAmount']);
      if (!valid) return;
    }
    if (step === 'terms') {
      const valid = await trigger([
        'totalInstallments',
        'installmentAmount',
        'dueDay',
      ]);
      if (!valid) return;
    }
    setStep(targetStep);
  };

  const getNextStep = (): Step => {
    switch (step) {
      case 'type':
        return 'info';
      case 'info':
        return isNegotiated ? 'terms' : 'review';
      case 'terms':
        return 'review';
      default:
        return 'review';
    }
  };

  const getPrevStep = (): Step => {
    switch (step) {
      case 'info':
        return 'type';
      case 'terms':
        return 'info';
      case 'review':
        return isNegotiated ? 'terms' : 'info';
      default:
        return 'type';
    }
  };

  const isInfoValid = formState.dirtyFields.name && !formState.errors.name &&
                      formState.dirtyFields.totalAmount && !formState.errors.totalAmount;

  const isTermsValid = !formState.errors.totalInstallments &&
                       !formState.errors.installmentAmount &&
                       !formState.errors.dueDay;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] overflow-hidden"
        data-testid="create-debt-modal"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Nova Dívida</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={step}
          isNegotiated={isNegotiated}
        />

        {/* Step Content */}
        <div className="min-h-[360px]">
          <AnimatePresence mode="wait">
            {step === 'type' && (
              <TypeStep
                key="type"
                value={isNegotiated}
                onChange={(value) => setValue('isNegotiated', value)}
                onNext={() => goToStep('info')}
              />
            )}
            {step === 'info' && (
              <InfoStep
                key="info"
                register={register}
                errors={formState.errors}
                onBack={() => goToStep('type')}
                onNext={() => goToStep(getNextStep())}
                isValid={!!isInfoValid}
              />
            )}
            {step === 'terms' && (
              <TermsStep
                key="terms"
                register={register}
                errors={formState.errors}
                control={control}
                setValue={setValue}
                onBack={() => goToStep('info')}
                onNext={() => goToStep('review')}
                isValid={isTermsValid}
                currentMonth={currentMonth}
              />
            )}
            {step === 'review' && (
              <ReviewStep
                key="review"
                control={control}
                onBack={() => goToStep(getPrevStep())}
                onSubmit={handleSubmit}
                isSubmitting={createDebt.isPending}
                currentMonth={currentMonth}
              />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
