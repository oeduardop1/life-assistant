'use client';

import { useMemo } from 'react';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import * as zxcvbnPtBrPackage from '@zxcvbn-ts/language-pt-br';
import { cn } from '@/lib/utils';
import { passwordStrengthLevels, MIN_PASSWORD_SCORE } from '@/lib/validations/settings';

// Configure zxcvbn with language packages
const options = {
  translations: zxcvbnPtBrPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
    ...zxcvbnPtBrPackage.dictionary,
  },
};
zxcvbnOptions.setOptions(options);

interface PasswordStrengthMeterProps {
  password: string;
  userInputs?: string[];
  className?: string;
}

/**
 * PasswordStrengthMeter - Visual indicator of password strength
 *
 * Uses zxcvbn-ts for accurate strength estimation.
 * Shows colored progress bar and label.
 * Minimum score of 2 required for valid password.
 */
export function PasswordStrengthMeter({
  password,
  userInputs = [],
  className,
}: PasswordStrengthMeterProps) {
  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password, userInputs);
  }, [password, userInputs]);

  if (!password || !result) {
    return null;
  }

  const level = passwordStrengthLevels[result.score];
  const progressWidth = ((result.score + 1) / 5) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar container */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {/* Animated progress indicator */}
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            level.color,
          )}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Label and feedback */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            'font-medium transition-colors',
            result.score >= MIN_PASSWORD_SCORE
              ? 'text-muted-foreground'
              : 'text-destructive',
          )}
        >
          {level.label}
        </span>

        {result.feedback.warning && (
          <span className="text-muted-foreground truncate ml-2 max-w-[60%]">
            {result.feedback.warning}
          </span>
        )}
      </div>

      {/* Suggestions */}
      {result.feedback.suggestions.length > 0 && result.score < MIN_PASSWORD_SCORE && (
        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
          {result.feedback.suggestions.slice(0, 2).map((suggestion, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <span className="text-muted-foreground/60 select-none">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Hook to get password strength result
 */
export function usePasswordStrength(password: string, userInputs: string[] = []) {
  return useMemo(() => {
    if (!password) return null;
    return zxcvbn(password, userInputs);
  }, [password, userInputs]);
}
