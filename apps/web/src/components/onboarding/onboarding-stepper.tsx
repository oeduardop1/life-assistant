'use client';

import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStep } from '@/lib/validations/onboarding';

/**
 * Step configuration with labels and descriptions (3 steps: profile → telegram → tutorial)
 */
const STEPS: Array<{
  id: OnboardingStep;
  label: string;
  description: string;
}> = [
  {
    id: 'profile',
    label: 'Perfil',
    description: 'Nome e fuso horário',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Opcional: conecte o bot',
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    description: 'Conheça o app',
  },
];

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

/**
 * OnboardingStepper - Visual progress indicator for the onboarding wizard
 *
 * Shows 3 steps with their completion status:
 * - Completed: green checkmark
 * - Current: highlighted circle
 * - Pending: gray circle
 *
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
export function OnboardingStepper({
  currentStep,
  completedSteps,
}: OnboardingStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progresso do onboarding" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPending = !isCompleted && !isCurrent;

          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 top-4 -translate-y-1/2 h-0.5 w-full -translate-x-1/2',
                    index <= currentIndex || completedSteps.includes(STEPS[index - 1].id)
                      ? 'bg-primary'
                      : 'bg-muted',
                  )}
                  style={{ width: '100%', left: '-50%' }}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary',
                  isPending && 'border-muted',
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Circle
                    className={cn(
                      'h-5 w-5',
                      isCurrent ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isCompleted && 'text-primary',
                    isCurrent && 'text-foreground',
                    isPending && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                <p
                  className={cn(
                    'text-xs hidden sm:block',
                    isPending ? 'text-muted-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
