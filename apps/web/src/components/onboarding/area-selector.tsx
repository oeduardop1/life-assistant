'use client';

import { useState } from 'react';
import {
  Heart,
  DollarSign,
  Briefcase,
  Users,
  Sparkles,
  TrendingUp,
  Brain,
  Gamepad2,
  Check,
} from 'lucide-react';
import { LifeArea } from '@life-assistant/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AreasStepData } from '@/lib/validations/onboarding';

/**
 * Area configuration with icons and labels
 */
const AREA_CONFIG: Record<
  LifeArea,
  { icon: React.ElementType; label: string; description: string }
> = {
  [LifeArea.HEALTH]: {
    icon: Heart,
    label: 'Saúde',
    description: 'Exercícios, alimentação, sono',
  },
  [LifeArea.FINANCIAL]: {
    icon: DollarSign,
    label: 'Finanças',
    description: 'Orçamento, investimentos, metas',
  },
  [LifeArea.CAREER]: {
    icon: Briefcase,
    label: 'Carreira',
    description: 'Trabalho, objetivos profissionais',
  },
  [LifeArea.RELATIONSHIPS]: {
    icon: Users,
    label: 'Relacionamentos',
    description: 'Família, amigos, parceiros',
  },
  [LifeArea.SPIRITUALITY]: {
    icon: Sparkles,
    label: 'Espiritualidade',
    description: 'Fé, meditação, propósito',
  },
  [LifeArea.PERSONAL_GROWTH]: {
    icon: TrendingUp,
    label: 'Crescimento Pessoal',
    description: 'Aprendizado, habilidades',
  },
  [LifeArea.MENTAL_HEALTH]: {
    icon: Brain,
    label: 'Saúde Mental',
    description: 'Emoções, bem-estar psicológico',
  },
  [LifeArea.LEISURE]: {
    icon: Gamepad2,
    label: 'Lazer',
    description: 'Hobbies, entretenimento',
  },
};

const ALL_AREAS = Object.values(LifeArea);
const MIN_AREAS = 3;
const MAX_AREAS = 8;

interface AreaSelectorProps {
  defaultValues?: LifeArea[];
  onSubmit: (data: AreasStepData) => Promise<void>;
  isLoading?: boolean;
}

/**
 * AreaSelector - Second step of onboarding wizard
 *
 * Allows user to select 3-8 life areas to focus on.
 * Selected areas get weight 1.0, unselected get 0.0.
 *
 * @see SYSTEM_SPECS.md §3.1 for validation requirements
 */
export function AreaSelector({
  defaultValues = [],
  onSubmit,
  isLoading = false,
}: AreaSelectorProps) {
  const [selected, setSelected] = useState<LifeArea[]>(defaultValues);
  const [error, setError] = useState<string | null>(null);

  const toggleArea = (area: LifeArea) => {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(area)) {
        return prev.filter((a) => a !== area);
      }
      if (prev.length >= MAX_AREAS) {
        setError(`Você pode selecionar no máximo ${String(MAX_AREAS)} áreas`);
        return prev;
      }
      return [...prev, area];
    });
  };

  const handleSubmit = async () => {
    if (selected.length < MIN_AREAS) {
      setError(`Selecione pelo menos ${String(MIN_AREAS)} áreas da vida`);
      return;
    }
    await onSubmit({ areas: selected });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground">
          Selecione de {MIN_AREAS} a {MAX_AREAS} áreas que você quer focar.
          <br />
          <span className="text-sm">
            Selecionadas: {selected.length}/{MAX_AREAS}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ALL_AREAS.map((area) => {
          const config = AREA_CONFIG[area];
          const Icon = config.icon;
          const isSelected = selected.includes(area);

          return (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-muted bg-background hover:bg-muted/50',
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              <Icon
                className={cn(
                  'h-8 w-8',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}
              >
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground text-center hidden sm:block">
                {config.description}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={isLoading || selected.length < MIN_AREAS}
        onClick={handleSubmit}
      >
        {isLoading ? 'Salvando...' : 'Continuar'}
      </Button>
    </div>
  );
}
