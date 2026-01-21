'use client';

import { useState } from 'react';
import {
  Heart,
  DollarSign,
  Briefcase,
  Users,
  Sparkles,
  BookOpen,
  Check,
} from 'lucide-react';
import { LifeArea } from '@life-assistant/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AreasStepData } from '@/lib/validations/onboarding';

/**
 * Area configuration with icons and labels
 * ADR-017: 6 main areas (health, finance, professional, learning, spiritual, relationships)
 */
const AREA_CONFIG: Record<
  LifeArea,
  { icon: React.ElementType; label: string; description: string }
> = {
  [LifeArea.HEALTH]: {
    icon: Heart,
    label: 'Saúde',
    description: 'Física, mental, lazer e bem-estar',
  },
  [LifeArea.FINANCE]: {
    icon: DollarSign,
    label: 'Finanças',
    description: 'Orçamento, poupança, dívidas, investimentos',
  },
  [LifeArea.PROFESSIONAL]: {
    icon: Briefcase,
    label: 'Profissional',
    description: 'Carreira, negócios, projetos',
  },
  [LifeArea.LEARNING]: {
    icon: BookOpen,
    label: 'Aprendizado',
    description: 'Cursos, leitura, autodidatismo',
  },
  [LifeArea.SPIRITUAL]: {
    icon: Sparkles,
    label: 'Espiritual',
    description: 'Devocionais, meditação, comunidade',
  },
  [LifeArea.RELATIONSHIPS]: {
    icon: Users,
    label: 'Relacionamentos',
    description: 'Família, romântico, social',
  },
};

const ALL_AREAS = Object.values(LifeArea);
const MIN_AREAS = 3;
const MAX_AREAS = 6;

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
 * @see docs/specs/system.md §3.1 for validation requirements
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
