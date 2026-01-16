'use client';

import { useState } from 'react';
import {
  MessageSquare,
  BarChart3,
  Bell,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SkipButton } from './skip-button';

/**
 * Tutorial slide configuration
 */
const TUTORIAL_SLIDES = [
  {
    icon: MessageSquare,
    title: 'Converse com a IA',
    description:
      'Sua assistente pessoal esta sempre disponivel para ajudar com decisoes, organizar tarefas e oferecer conselhos personalizados.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe seu progresso',
    description:
      'Registre metricas importantes como peso, sono, exercicios e gastos. Visualize graficos e identifique padroes.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Bell,
    title: 'Lembretes inteligentes',
    description:
      'Receba notificacoes personalizadas para medicamentos, agua, exercicios e compromissos importantes.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Tome decisoes melhores',
    description:
      'Use a matriz de decisao para escolhas importantes. A IA te ajuda a pesar pros e contras de forma estruturada.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

interface TutorialCarouselProps {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * TutorialCarousel - Fourth step of onboarding wizard (optional)
 *
 * Shows 3-4 slides introducing key features of the app.
 * User can navigate through slides or skip directly to dashboard.
 *
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
export function TutorialCarousel({
  onComplete,
  onSkip,
  isLoading = false,
}: TutorialCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;

  const goToPrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (!isLastSlide) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const slide = TUTORIAL_SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div
            className={cn(
              'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
              slide.bgColor,
            )}
          >
            <Icon className={cn('h-10 w-10', slide.color)} />
          </div>
          <CardTitle className="text-xl">{slide.title}</CardTitle>
          <CardDescription className="text-base">
            {slide.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Slide indicators */}
          <div className="flex justify-center gap-2 pt-4">
            {TUTORIAL_SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  index === currentSlide
                    ? 'w-6 bg-primary'
                    : 'bg-muted hover:bg-muted-foreground/50',
                )}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Ir para slide ${String(index + 1)}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          disabled={isFirstSlide}
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          {isLastSlide ? (
            <Button
              type="button"
              className="w-full"
              onClick={onComplete}
              disabled={isLoading}
            >
              {isLoading ? 'Finalizando...' : 'Comecar a usar'}
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={goToNext}
            >
              Proximo
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={isLastSlide}
          aria-label="Proximo slide"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <SkipButton
        onSkip={onSkip}
        isLoading={isLoading}
        label="Pular tutorial"
      />
    </div>
  );
}
