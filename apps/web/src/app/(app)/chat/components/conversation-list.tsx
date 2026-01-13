'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isCreating: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  isLoading,
  isCreating,
}: ConversationListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDelete(conversationToDelete.id);
      setConversationToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setConversationToDelete(null);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* New conversation button */}
        <div className="p-4 border-b">
          <Button
            onClick={onCreate}
            disabled={isCreating}
            className="w-full cursor-pointer"
            variant="outline"
            data-testid="chat-new-conversation"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Conversa
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma conversa ainda
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors',
                    selectedId === conversation.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => onSelect(conversation.id)}
                  data-testid={`chat-conversation-${conversation.id}`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-sm">
                    {conversation.title || 'Nova conversa'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6 shrink-0 cursor-pointer transition-opacity hover:text-destructive',
                      selectedId === conversation.id
                        ? 'opacity-70 hover:opacity-100'
                        : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                    )}
                    onClick={(e) => handleDeleteClick(e, conversation)}
                    data-testid={`chat-delete-${conversation.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              {conversationToDelete?.title
                ? `A conversa "${conversationToDelete.title}" será excluída.`
                : 'Esta conversa será excluída.'}
              {' '}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
