'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { conversationItem } from './chat-animations';
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

/**
 * Groups conversations by date: Today, Yesterday, This Week, Older
 */
function groupConversationsByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; conversations: Conversation[] }[] = [
    { label: 'Hoje', conversations: [] },
    { label: 'Ontem', conversations: [] },
    { label: 'Esta semana', conversations: [] },
    { label: 'Anteriores', conversations: [] },
  ];

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    const convDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (convDate.getTime() === today.getTime()) {
      groups[0].conversations.push(conv);
    } else if (convDate.getTime() === yesterday.getTime()) {
      groups[1].conversations.push(conv);
    } else if (convDate > weekAgo) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
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

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* New conversation button */}
        <div className="p-4 border-b">
          <Button
            onClick={onCreate}
            disabled={isCreating}
            className="w-full cursor-pointer bg-chat-accent hover:bg-chat-accent/90 text-chat-accent-foreground"
            data-testid="chat-new-conversation"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Conversa
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma conversa ainda
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label}>
                  <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                      {group.conversations.map((conversation) => (
                        <motion.div
                          key={conversation.id}
                          variants={conversationItem}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className={cn(
                            'group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors',
                            selectedId === conversation.id
                              ? 'bg-chat-accent/15 text-chat-accent border-l-2 border-chat-accent'
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
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
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
                ? `A conversa "${conversationToDelete.title}" sera excluida.`
                : 'Esta conversa sera excluida.'}
              {' '}Esta acao nao pode ser desfeita.
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
