'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  Conversation,
  ConversationListResponse,
  ConversationType,
} from '../types';

const CONVERSATIONS_KEY = ['conversations'];

/**
 * Hook for managing conversations
 */
export function useConversations() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  // List conversations
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.get<ConversationListResponse>('/chat/conversations'),
    enabled: api.isAuthenticated,
  });

  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: (params: { title?: string; type?: ConversationType }) =>
      api.post<Conversation>('/chat/conversations', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) =>
      api.delete(`/chat/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });

  return {
    conversations: data?.conversations ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    createConversation: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteConversation: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
