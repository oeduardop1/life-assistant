'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

interface StrengthConfig {
  label: string;
  color: string;
  bgColor: string;
}

const strengthConfigs: Record<StrengthLevel, StrengthConfig> = {
  0: { label: '', color: '', bgColor: 'bg-muted' },
  1: { label: 'Muito fraca', color: 'text-red-500', bgColor: 'bg-red-500' },
  2: { label: 'Fraca', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  3: { label: 'Boa', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  4: { label: 'Forte', color: 'text-green-500', bgColor: 'bg-green-500' },
};

/**
 * PasswordStrength - Visual indicator for password strength
 *
 * Analyzes password and shows a colored bar indicator with text feedback.
 * Uses simple heuristics (length, character types) for evaluation.
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = React.useMemo((): StrengthLevel => {
    if (!password) return 0;

    let score = 0;

    // Length checks
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character type checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Normalize to 1-4 range
    if (score === 0) return 0;
    if (score <= 2) return 1;
    if (score === 3) return 2;
    if (score === 4) return 3;
    return 4;
  }, [password]);

  const config = strengthConfigs[strength];

  if (!password) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Strength bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              level <= strength ? config.bgColor : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      {strength > 0 && (
        <p className={cn('text-xs transition-colors duration-300', config.color)}>
          {config.label}
        </p>
      )}
    </div>
  );
}
