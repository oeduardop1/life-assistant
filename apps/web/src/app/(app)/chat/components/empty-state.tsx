'use client';

import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'no-conversations' | 'no-selection';
  onCreateConversation?: () => void;
}

export function EmptyState({ type, onCreateConversation }: EmptyStateProps) {
  if (type === 'no-conversations') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="chat-empty-no-conversations">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhuma conversa ainda</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
          Inicie uma conversa com sua assistente pessoal. Ela pode ajudar com
          organização, decisões e reflexões.
        </p>
        {onCreateConversation && (
          <Button onClick={onCreateConversation} data-testid="chat-start-conversation">
            <Plus className="mr-2 h-4 w-4" />
            Iniciar Conversa
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="chat-empty-no-selection">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Escolha uma conversa existente ou inicie uma nova para começar.
      </p>
    </div>
  );
}
