'use client';

import { useMemo } from 'react';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import * as zxcvbnPtBrPackage from '@zxcvbn-ts/language-pt-br';
import { Check, X, AlertTriangle } from 'lucide-react';
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

const strengthColors = {
  0: { bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/30' },
  1: { bg: 'bg-orange-500', text: 'text-orange-500', glow: 'shadow-orange-500/30' },
  2: { bg: 'bg-yellow-500', text: 'text-yellow-500', glow: 'shadow-yellow-500/30' },
  3: { bg: 'bg-lime-500', text: 'text-lime-500', glow: 'shadow-lime-500/30' },
  4: { bg: 'bg-green-500', text: 'text-green-500', glow: 'shadow-green-500/30' },
} as const;

/**
 * PasswordStrengthMeter - Visual indicator of password strength
 *
 * Uses zxcvbn-ts for accurate strength estimation.
 * Shows segmented progress bar and detailed feedback.
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
  const colors = strengthColors[result.score as keyof typeof strengthColors];
  const isValid = result.score >= MIN_PASSWORD_SCORE;

  return (
    <div className={cn('space-y-4 animate-in fade-in-50 duration-200', className)}>
      {/* Segmented strength bar */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                segment <= result.score
                  ? cn(colors.bg, 'shadow-sm', colors.glow)
                  : 'bg-muted/50'
              )}
            />
          ))}
        </div>

        {/* Label and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                colors.text
              )}
            >
              {level.label}
            </span>
            {isValid ? (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="w-3.5 h-3.5" />
                Válida
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Mínimo: Razoável
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warning message */}
      {result.feedback.warning && (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {result.feedback.warning}
          </p>
        </div>
      )}

      {/* Suggestions */}
      {result.feedback.suggestions.length > 0 && result.score < MIN_PASSWORD_SCORE && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Sugestões para melhorar:
          </p>
          <ul className="space-y-1.5">
            {result.feedback.suggestions.slice(0, 3).map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-muted-foreground animate-in slide-in-from-left-2 duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message when valid */}
      {isValid && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/10 px-3 py-2 animate-in fade-in-50 duration-200">
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            Sua senha atende aos requisitos de segurança
          </p>
        </div>
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
