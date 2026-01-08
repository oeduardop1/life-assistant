'use client';

import { Button } from '@/components/ui/button';

interface SkipButtonProps {
  onSkip: () => Promise<void>;
  isLoading?: boolean;
  label?: string;
}

/**
 * SkipButton - Button for skipping optional onboarding steps
 *
 * Used in:
 * - Telegram step (optional integration)
 * - Tutorial step (can skip to dashboard)
 *
 * @see SYSTEM_SPECS.md §3.1 for optional step requirements
 */
export function SkipButton({
  onSkip,
  isLoading = false,
  label = 'Pular esta etapa',
}: SkipButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full"
      disabled={isLoading}
      onClick={onSkip}
    >
      {isLoading ? 'Pulando...' : label}
    </Button>
  );
}
