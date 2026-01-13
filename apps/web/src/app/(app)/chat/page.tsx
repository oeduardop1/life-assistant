'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  } = useChat({ conversationId: selectedConversationId });

  // Handle creating a new conversation
  const handleCreateConversation = useCallback(() => {
    createConversation(
      { type: 'general' },
      {
        onSuccess: (newConversation) => {
          setSelectedConversationId(newConversation.id);
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
      deleteConversation(id);
    },
    [selectedConversationId, deleteConversation, setSelectedConversationId]
  );

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Sidebar */}
      <Card className="w-72 shrink-0 overflow-hidden">
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

      {/* Main chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
            />
            <MessageInput
              onSend={sendMessage}
              onCancel={cancelStream}
              isStreaming={isStreaming}
              disabled={false}
            />
          </>
        )}
      </Card>
    </div>
  );
}
