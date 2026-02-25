'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { useAuthContext } from '@/contexts/auth-context';
import type {
  MessageListResponse,
  SendMessageResponse,
  StreamChunk,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface UseChatOptions {
  conversationId: string | null;
}

/**
 * Hook for chat functionality with SSE streaming
 */
export function useChat({ conversationId }: UseChatOptions) {
  const api = useAuthenticatedApi();
  const { session } = useAuthContext();
  const queryClient = useQueryClient();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreamingDone, setIsStreamingDone] = useState(false); // Backend finished, waiting for typewriter
  const [error, setError] = useState<string | null>(null);
  const [prevConversationId, setPrevConversationId] = useState(conversationId);

  const eventSourceRef = useRef<EventSource | null>(null);
  const streamCompletedRef = useRef(false);

  // Reset state when conversation changes (React-recommended pattern)
  // This runs during render, not in an effect, to avoid cascading renders
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (prevConversationId !== conversationId) {
    setPrevConversationId(conversationId);
    setStreamingContent('');
    setError(null);
    setIsStreaming(false);
    setIsStreamingDone(false);
  }

  // Cleanup EventSource on unmount or conversation change
  useEffect(() => {
    // Reset the ref when conversation changes
    streamCompletedRef.current = false;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [conversationId]);

  // Messages query
  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      api.get<MessageListResponse>(
        `/chat/conversations/${conversationId}/messages`
      ),
    enabled: !!conversationId && api.isAuthenticated,
  });

  // Get all messages including streaming content
  const messages = messagesQuery.data?.messages ?? [];

  // Send message and start streaming
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !session?.access_token) return;

      setError(null);
      setIsStreaming(true);
      setIsStreamingDone(false);
      setStreamingContent('');
      streamCompletedRef.current = false;

      // Close any existing EventSource before creating a new one
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      try {
        // Send the message
        await api.post<SendMessageResponse>(
          `/chat/conversations/${conversationId}/messages`,
          { content }
        );

        // Invalidate messages to get the user message
        await queryClient.invalidateQueries({
          queryKey: ['messages', conversationId],
        });

        // Start SSE stream for assistant response
        const streamUrl = `${API_URL}/chat/conversations/${conversationId}/stream`;
        const eventSource = new EventSource(
          `${streamUrl}?token=${session.access_token}`
        );
        eventSourceRef.current = eventSource;

        // Handle regular messages (content, error, done)
        eventSource.onmessage = (event) => {
          try {
            const chunk: StreamChunk = JSON.parse(event.data as string);

            if (chunk.error) {
              setError(chunk.error);
              eventSource.close();
              setIsStreaming(false);
              return;
            }

            // Only append if content exists and is not empty
            if (chunk.content) {
              setStreamingContent((prev) => prev + chunk.content);
            }

            if (chunk.done) {
              streamCompletedRef.current = true;
              eventSource.close();
              setError(null); // Clear any error that might have been set by race condition

              // When content was streamed, keep StreamingMessage mounted for
              // the typewriter effect — it will call finishStreaming() on
              // completion. When NO content was streamed (e.g. loop guard
              // produced a non-streamed response), skip straight to
              // finishStreaming() so DB messages are fetched immediately.
              setIsStreamingDone(true);
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        };

        eventSource.onerror = () => {
          // Small delay to handle race condition where onerror fires
          // before onmessage with done=true is fully processed
          setTimeout(() => {
            // Only clean up if stream didn't complete normally.
            // EventSource fires onerror when connection closes, even on success.
            // When stream completed normally, finishStreaming() handles cleanup
            // after the typewriter effect completes.
            if (!streamCompletedRef.current) {
              setError('Conexão perdida. Por favor, tente novamente.');
              setIsStreaming(false);
            }
          }, 100);
          eventSource.close();
        };
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Erro ao enviar mensagem'
        );
        setIsStreaming(false);
      }
    },
    [conversationId, session, api, queryClient]
  );

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setIsStreamingDone(false);
    setStreamingContent('');
  }, []);

  // Finish streaming - called by StreamingMessage when typewriter completes
  const finishStreaming = useCallback(async () => {
    // refetchQueries returns a promise that resolves AFTER the fetch settles,
    // unlike invalidateQueries which only marks stale and may resolve before
    // the background refetch completes. This prevents the race condition where
    // StreamingMessage unmounts before MessageBubble has the new data.
    await queryClient.refetchQueries({
      queryKey: ['messages', conversationId],
    });
    // Also refresh conversations to update updatedAt (no need to wait)
    queryClient.invalidateQueries({
      queryKey: ['conversations'],
    });
    // Only THEN clear streaming state - this unmounts StreamingMessage
    // At this point, MessageBubble is already rendered with the new message
    setIsStreaming(false);
    setIsStreamingDone(false);
    setStreamingContent('');
  }, [queryClient, conversationId]);

  // Safety net: when backend finishes (done:true) but no content was streamed,
  // StreamingMessage never mounts so finishStreaming() is never called.
  // Fetch DB messages directly so the response appears.
  useEffect(() => {
    if (isStreamingDone && !streamingContent) {
      finishStreaming();
    }
  }, [isStreamingDone, streamingContent, finishStreaming]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoadingMessages: messagesQuery.isLoading,
    messagesError: messagesQuery.error,
    sendMessage,
    isStreaming,
    streamingContent,
    isStreamingDone,
    error,
    cancelStream,
    finishStreaming,
    refetchMessages: messagesQuery.refetch,
    clearError,
  };
}
