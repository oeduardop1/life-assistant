'use client';

import { useState, useEffect, useRef } from 'react';
import { User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './markdown-content';
import { AriaAvatar } from './aria-avatar';
import { AnimatedMessage, ThinkingDots } from './chat-animations';
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
    <AnimatedMessage
      messageKey={message.id}
      isUser={isUser}
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className="contents"
        data-testid={`chat-message-${message.id}`}
        data-role={message.role}
      >
        {/* Avatar */}
        {isUser ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chat-user-bg">
            <User className="h-4 w-4 text-chat-user-foreground" />
          </div>
        ) : (
          <AriaAvatar size="md" />
        )}

        {/* Message content */}
        <div
          className={cn(
            'flex max-w-[80%] flex-col gap-1 group',
            isUser ? 'items-end' : 'items-start'
          )}
        >
          <div
            className={cn(
              'rounded-2xl px-4 py-2',
              isUser
                ? 'bg-chat-user-bg text-chat-user-foreground rounded-br-md'
                : 'bg-chat-accent-soft text-foreground rounded-bl-md'
            )}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownContent content={message.content} className="text-sm" />
            )}
          </div>
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </AnimatedMessage>
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
 * @see docs/specs/system.md §4.2 "Typing indicator + streaming"
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
    <AnimatedMessage
      messageKey="streaming"
      isUser={false}
      className="flex gap-3 p-4"
    >
      <div
        className="contents"
        data-testid="chat-streaming-message"
        ref={scrollRef}
      >
        {/* Avatar */}
        <AriaAvatar size="md" isThinking={!isComplete} />

        {/* Message content */}
        <div className="flex max-w-[80%] flex-col gap-1">
          <div className="rounded-2xl rounded-bl-md px-4 py-2 bg-chat-accent-soft">
            <div className="text-sm">
              <MarkdownContent
                content={displayedContent}
                isStreaming={!isComplete}
                className="text-sm"
              />
              {!isComplete && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-chat-accent rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatedMessage>
  );
}

/**
 * ThinkingIndicator - Shows while AI is processing before streaming starts
 *
 * @see docs/specs/system.md §4.2 "Typing indicator + streaming"
 */
export function ThinkingIndicator() {
  return (
    <AnimatedMessage
      messageKey="thinking"
      isUser={false}
      className="flex gap-3 p-4"
    >
      <div className="contents" data-testid="chat-thinking-indicator">
        {/* Avatar */}
        <AriaAvatar size="md" isThinking />

        {/* Thinking indicator */}
        <div className="flex max-w-[80%] flex-col gap-1">
          <div className="rounded-2xl rounded-bl-md px-4 py-2 bg-chat-accent-soft">
            <div className="flex items-center gap-3">
              <ThinkingDots />
              <span className="text-sm text-muted-foreground">Pensando...</span>
            </div>
          </div>
        </div>
      </div>
    </AnimatedMessage>
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
