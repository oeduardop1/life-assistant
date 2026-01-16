'use client';

import Link from 'next/link';
import { MessageSquare, UserPen, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sourceLabels, type KnowledgeItemSource } from '../types';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: KnowledgeItemSource;
  sourceRef?: string | null;
  className?: string;
}

const iconMap: Record<KnowledgeItemSource, React.ReactNode> = {
  conversation: <MessageSquare className="h-3 w-3" />,
  user_input: <UserPen className="h-3 w-3" />,
  ai_inference: <Sparkles className="h-3 w-3" />,
};

export function SourceBadge({ source, sourceRef, className }: SourceBadgeProps) {
  const label = sourceLabels[source];
  const icon = iconMap[source];
  const isClickable = source === 'conversation' && sourceRef;

  const content = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1',
        isClickable && 'cursor-pointer hover:bg-accent',
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </Badge>
  );

  if (isClickable) {
    return (
      <Link href={`/chat?c=${sourceRef}`} title="Ver conversa original">
        {content}
      </Link>
    );
  }

  return content;
}
