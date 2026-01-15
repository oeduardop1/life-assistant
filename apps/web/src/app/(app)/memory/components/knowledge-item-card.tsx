'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Check, Clock, History } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfidenceIndicator } from './confidence-indicator';
import { SourceBadge } from './source-badge';
import { type KnowledgeItem, knowledgeItemTypeLabels, lifeAreaLabels } from '../types';
import { cn } from '@/lib/utils';

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  onValidate: (item: KnowledgeItem) => void;
  isValidating?: boolean;
}

export function KnowledgeItemCard({
  item,
  onEdit,
  onDelete,
  onValidate,
  isValidating,
}: KnowledgeItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isSuperseded = !!item.supersededAt;

  return (
    <Card
      className={cn(
        'group transition-all',
        isSuperseded && 'opacity-60 border-dashed'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {item.title && (
              <h3 className="font-medium text-sm truncate">{item.title}</h3>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {knowledgeItemTypeLabels[item.type]}
              </Badge>
              {item.area && (
                <Badge variant="outline" className="text-xs">
                  {lifeAreaLabels[item.area]}
                </Badge>
              )}
              {/* Superseded badge (M1.6.1) */}
              {isSuperseded && (
                <Badge variant="secondary" className="text-xs opacity-80">
                  <History className="h-3 w-3 mr-1" />
                  Substituído em {formatDate(item.supersededAt!)}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
                  menuOpen && 'opacity-100'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  onEdit(item);
                  setMenuOpen(false);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {!item.validatedByUser && (
                <DropdownMenuItem
                  onClick={() => {
                    onValidate(item);
                    setMenuOpen(false);
                  }}
                  disabled={isValidating}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Validar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onDelete(item);
                  setMenuOpen(false);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <ConfidenceIndicator confidence={item.confidence} size="sm" />
            <SourceBadge source={item.source} sourceRef={item.sourceRef} />
            {item.validatedByUser && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                <Check className="h-3 w-3 mr-1" />
                Validado
              </Badge>
            )}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(item.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
