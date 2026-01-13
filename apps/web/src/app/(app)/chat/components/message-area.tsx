'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble, StreamingMessage } from './message-bubble';
import type { Message } from '../types';

interface MessageAreaProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
}

export function MessageArea({
  messages,
  streamingContent,
  isStreaming,
  isLoading,
}: MessageAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent]);

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
    <ScrollArea className="flex-1">
      <div className="flex flex-col" data-testid="chat-message-area">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
