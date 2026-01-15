'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Brain, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { KnowledgeItemCard } from './knowledge-item-card';
import type { KnowledgeItem } from '../types';

interface KnowledgeItemsListProps {
  items: KnowledgeItem[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  onValidate: (item: KnowledgeItem) => void;
  validatingId?: string | null;
  isFiltered?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border rounded-xl space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  isFiltered?: boolean;
}

function EmptyState({ isFiltered = false }: EmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground text-sm">
          <p className="font-medium">Nenhum conhecimento encontrado</p>
          <p className="mt-1">Ajuste os filtros de busca.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Brain className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="font-medium">A IA ainda está aprendendo sobre você</p>
      <p className="mt-1 text-muted-foreground text-sm">
        Converse comigo e vou lembrar das coisas importantes.
      </p>
      <Link href="/chat">
        <Button className="mt-4">Iniciar conversa</Button>
      </Link>
    </div>
  );
}

export function KnowledgeItemsList({
  items,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onEdit,
  onDelete,
  onValidate,
  validatingId,
  isFiltered,
}: KnowledgeItemsListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState isFiltered={isFiltered} />;
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-4 pr-4">
        {items.map((item) => (
          <KnowledgeItemCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onValidate={onValidate}
            isValidating={validatingId === item.id}
          />
        ))}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
