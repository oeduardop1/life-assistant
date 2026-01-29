'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AriaAvatar } from './aria-avatar';
import { SuggestionChip } from './chat-animations';

interface EmptyStateProps {
  type: 'no-conversations' | 'no-selection';
  onCreateConversation?: () => void;
}

const suggestions = [
  'Me ajude a organizar meu dia',
  'Quero refletir sobre uma decisao',
  'Como posso melhorar minha rotina?',
  'Preciso desabafar sobre algo',
];

export function EmptyState({ type, onCreateConversation }: EmptyStateProps) {
  if (type === 'no-conversations') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-center bg-chat-bg"
        data-testid="chat-empty-no-conversations"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="mb-6"
        >
          <AriaAvatar size="lg" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-medium mb-2">Ola! Eu sou a Aria</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Sua assistente pessoal. Estou aqui para ajudar com organizacao,
            decisoes e reflexoes. Vamos comecar?
          </p>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center max-w-md mb-6"
        >
          {suggestions.map((suggestion, i) => (
            <SuggestionChip
              key={suggestion}
              index={i}
              onClick={() => {
                onCreateConversation?.();
              }}
            >
              {suggestion}
            </SuggestionChip>
          ))}
        </motion.div>

        {onCreateConversation && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={onCreateConversation}
              className="bg-chat-accent hover:bg-chat-accent/90 text-chat-accent-foreground"
              data-testid="chat-start-conversation"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Iniciar Conversa
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 text-center bg-chat-bg"
      data-testid="chat-empty-no-selection"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="mb-4"
      >
        <AriaAvatar size="lg" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Escolha uma conversa existente ou inicie uma nova para comecar.
        </p>
      </motion.div>
    </div>
  );
}
