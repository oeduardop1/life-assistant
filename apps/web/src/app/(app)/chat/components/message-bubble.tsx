'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Bot, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message } from '../types';

interface UseTypewriterResult {
  displayedContent: string;
  isComplete: boolean;
}

/**
 * useTypewriter - Hook for typewriter effect
 *
 * Gradually reveals content character by character for a smooth typing effect.
 * Note: Reset happens automatically when component unmounts (new conversation).
 *
 * Speed is set to 5ms per character (~200 char/second) to feel natural
 * while still providing visual feedback that text is appearing progressively.
 * This is faster than traditional typewriter effects but similar to how
 * Claude Chat renders text in "chunk mode".
 *
 * @param content - Full content to reveal
 * @param speed - Milliseconds per character (default: 5ms for fast but smooth effect)
 * @returns Object with displayedContent and isComplete flag
 */
function useTypewriter(content: string, speed: number = 5): UseTypewriterResult {
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    // If we've already displayed all content, nothing to do
    if (displayedLength >= content.length) {
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + 1, content.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [content.length, displayedLength, speed]);

  return {
    displayedContent: content.slice(0, displayedLength),
    isComplete: displayedLength >= content.length && content.length > 0,
  };
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      data-testid={`chat-message-${message.id}`}
      data-role={message.role}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
  onComplete?: () => void;
}

/**
 * StreamingMessage - Shows AI response with typewriter effect
 *
 * Uses typewriter effect to gradually reveal content character by character,
 * creating a smooth "typing" experience similar to ChatGPT/Claude/Gemini.
 *
 * @see SYSTEM_SPECS.md §4.2 "Typing indicator + streaming"
 */
export function StreamingMessage({ content, onComplete }: StreamingMessageProps) {
  const { displayedContent, isComplete } = useTypewriter(content);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as typewriter reveals text (throttled every ~50 chars for performance)
  useEffect(() => {
    const len = displayedContent.length;
    // Scroll on first char, every 50 chars, or when complete
    const shouldScroll = len === 1 || len % 50 === 0 || isComplete;
    if (shouldScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [displayedContent.length, isComplete]);

  // Notify parent when typewriter finishes
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  return (
    <div
      className="flex gap-3 p-4 animate-in fade-in-0 duration-300"
      data-testid="chat-streaming-message"
      ref={scrollRef}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>

      {/* Message content */}
      <div className="flex max-w-[80%] flex-col gap-1">
        <div className="rounded-2xl px-4 py-2 bg-muted">
          <p className="text-sm whitespace-pre-wrap">
            {displayedContent}
            {!isComplete && (
              <span className="inline-block w-2 h-4 ml-1 bg-foreground/50 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ThinkingIndicator - Shows while AI is processing before streaming starts
 *
 * @see SYSTEM_SPECS.md §4.2 "Typing indicator + streaming"
 */
export function ThinkingIndicator() {
  return (
    <div
      className="flex gap-3 p-4 animate-in fade-in-0 duration-300"
      data-testid="chat-thinking-indicator"
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>

      {/* Thinking indicator */}
      <div className="flex max-w-[80%] flex-col gap-1">
        <div className="rounded-2xl px-4 py-2 bg-muted">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pensando...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

/**
 * ErrorMessage - Shows error inline in conversation flow
 *
 * Displays errors as a styled message bubble instead of top-level alert,
 * keeping the user in the conversation context.
 */
export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div
      className="flex gap-3 p-4 animate-in fade-in-0 duration-300"
      data-testid="chat-error-message"
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>

      {/* Error content */}
      <div className="flex max-w-[80%] flex-col gap-2">
        <div className="rounded-2xl px-4 py-2 bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="self-start"
          >
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}
