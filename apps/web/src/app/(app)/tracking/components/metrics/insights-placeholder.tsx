'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TrackingType } from '../../types';
import { metricColors } from './metric-selector';

interface InsightsPlaceholderProps {
  type: TrackingType;
}

/**
 * InsightsPlaceholder - Teaser for future M2.5 insights functionality
 *
 * Shows a subtle, non-intrusive placeholder that:
 * - Indicates insights are coming
 * - Is contextual to the selected metric
 * - Creates anticipation without being annoying
 */
export function InsightsPlaceholder({ type }: InsightsPlaceholderProps) {
  const colors = metricColors[type];

  // Contextual teaser messages based on metric type
  const teaserMessages: Record<TrackingType, string> = {
    weight: 'Descubra como sono e exercícios afetam seu peso',
    water: 'Veja padrões de hidratação e seu impacto na energia',
    sleep: 'Entenda o que influencia a qualidade do seu sono',
    exercise: 'Correlações entre treino, humor e energia',
    mood: 'Fatores que mais impactam seu bem-estar',
    energy: 'O que está drenando ou aumentando sua energia',
    custom: 'Insights personalizados sobre suas métricas',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4',
        'bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30',
        colors.border
      )}
    >
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', colors.bg)}>
          <Lightbulb className={cn('h-4 w-4', colors.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Insights</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Sparkles className="h-2.5 w-2.5" />
              Em breve
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {teaserMessages[type]}
          </p>
        </div>
      </div>

      {/* Shimmer animation keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
