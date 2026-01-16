'use client';

import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * MarkdownContent - Renders markdown with Streamdown
 *
 * Handles incomplete markdown gracefully during streaming/typewriter.
 * Uses Tailwind prose classes for consistent styling.
 *
 * @see docs/specs/system.md §4.2 "Chat UI"
 */
export function MarkdownContent({
  content,
  isStreaming = false,
  className,
}: MarkdownContentProps) {
  return (
    <Streamdown
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        // Override prose defaults for chat context
        'prose-p:my-1 prose-p:leading-relaxed',
        'prose-headings:my-2 prose-headings:font-semibold',
        'prose-ul:my-1 prose-ol:my-1',
        'prose-li:my-0',
        'prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:italic',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs',
        'prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto',
        'prose-strong:font-semibold',
        className
      )}
      parseIncompleteMarkdown={isStreaming}
      isAnimating={isStreaming}
    >
      {content}
    </Streamdown>
  );
}
