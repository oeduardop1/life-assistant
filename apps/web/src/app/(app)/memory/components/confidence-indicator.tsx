'use client';

import { Badge } from '@/components/ui/badge';
import { getConfidenceLevel, confidenceLevelLabels, type ConfidenceLevel } from '../types';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const variantMap: Record<ConfidenceLevel, 'success' | 'warning' | 'destructive'> = {
  high: 'success',
  medium: 'warning',
  low: 'destructive',
};

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = 'md',
  className,
}: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(confidence);
  const variant = variantMap[level];
  const label = confidenceLevelLabels[level];
  const percentage = Math.round(confidence * 100);

  return (
    <Badge
      variant={variant}
      className={cn(
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        className
      )}
    >
      {showLabel ? `${label} (${percentage}%)` : `${percentage}%`}
    </Badge>
  );
}
