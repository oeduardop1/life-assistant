'use client';

import * as React from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthInputProps extends React.ComponentProps<'input'> {
  icon?: LucideIcon;
  label: string;
  error?: string;
}

/**
 * AuthInput - Enhanced input for auth forms
 *
 * Features a leading icon, enhanced focus states, and password visibility toggle.
 * Designed for the auth pages with smooth transitions and glow effects.
 */
export function AuthInput({
  icon: Icon,
  label,
  error,
  type,
  className,
  id,
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          id={id}
          type={inputType}
          className={cn(
            'flex h-11 w-full rounded-lg border border-input bg-background/50 text-base transition-all duration-200',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-chat-accent/30 focus:border-chat-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            Icon ? 'pl-10' : 'pl-4',
            isPassword ? 'pr-10' : 'pr-4',
            error && 'border-destructive focus:ring-destructive/30 focus:border-destructive',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
