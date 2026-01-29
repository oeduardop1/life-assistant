'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageBubble,
  StreamingMessage,
  ThinkingIndicator,
  ErrorMessage,
} from './message-bubble';
import type { Message } from '../types';

interface MessageAreaProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onStreamingComplete?: () => void;
}

export function MessageArea({
  messages,
  streamingContent,
  isStreaming,
  isLoading,
  error,
  onRetry,
  onStreamingComplete,
}: MessageAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or error appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent, error]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-16 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-chat-bg">
      <div className="flex flex-col" data-testid="chat-message-area">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Thinking indicator - before first chunk arrives */}
        {isStreaming && !streamingContent && <ThinkingIndicator />}

        {/* Streaming message - after first chunk arrives */}
        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} onComplete={onStreamingComplete} />
        )}

        {/* Error message - inline in conversation */}
        {error && !isStreaming && <ErrorMessage error={error} onRetry={onRetry} />}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
