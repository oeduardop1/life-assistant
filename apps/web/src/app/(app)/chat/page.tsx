'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import {
  ConversationList,
  MessageArea,
  MessageInput,
  EmptyState,
} from './components';
import { useConversations, useChat } from './hooks';

/**
 * Chat page - Main chat interface
 *
 * Features:
 * - Sidebar with conversation list
 * - Main area with messages and streaming
 * - Empty states for no conversations/no selection
 * - URL-based conversation selection (persists on refresh)
 *
 * @see MILESTONES.md M1.2 for chat module
 */
export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get conversation ID from URL (?c=conversationId)
  const selectedConversationId = searchParams.get('c');

  // Update URL when selecting a conversation
  const setSelectedConversationId = useCallback(
    (id: string | null) => {
      if (id) {
        router.push(`/chat?c=${id}`, { scroll: false });
      } else {
        router.push('/chat', { scroll: false });
      }
    },
    [router]
  );

  // Conversations hook
  const {
    conversations,
    isLoading: isLoadingConversations,
    createConversation,
    isCreating,
    deleteConversation,
  } = useConversations();

  // Chat hook for the selected conversation
  const {
    messages,
    isLoadingMessages,
    sendMessage,
    isStreaming,
    streamingContent,
    error,
    cancelStream,
    finishStreaming,
    clearError,
    refetchMessages,
  } = useChat({ conversationId: selectedConversationId });

  // Handle creating a new conversation
  const handleCreateConversation = useCallback(() => {
    createConversation(
      { type: 'general' },
      {
        onSuccess: (newConversation) => {
          setSelectedConversationId(newConversation.id);
          toast.success('Nova conversa criada');
        },
      }
    );
  }, [createConversation, setSelectedConversationId]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
      }
      deleteConversation(id, {
        onSuccess: () => {
          toast.success('Conversa excluída');
        },
      });
    },
    [selectedConversationId, deleteConversation, setSelectedConversationId]
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] gap-4">
      {/* Conversation sidebar - hidden on mobile */}
      <Card className="hidden md:flex w-72 shrink-0 overflow-hidden flex-col">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onCreate={handleCreateConversation}
          onDelete={handleDeleteConversation}
          isLoading={isLoadingConversations}
          isCreating={isCreating}
        />
      </Card>

      {/* Main chat area - full width on mobile */}
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Content */}
        {conversations.length === 0 && !isLoadingConversations ? (
          <EmptyState
            type="no-conversations"
            onCreateConversation={handleCreateConversation}
          />
        ) : !selectedConversationId ? (
          <EmptyState type="no-selection" />
        ) : (
          <>
            <MessageArea
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              isLoading={isLoadingMessages}
              error={error}
              onRetry={() => {
                clearError();
                refetchMessages();
              }}
              onStreamingComplete={finishStreaming}
            />
            <MessageInput
              onSend={sendMessage}
              onCancel={cancelStream}
              isStreaming={isStreaming}
            />
          </>
        )}
      </Card>
    </div>
  );
}
