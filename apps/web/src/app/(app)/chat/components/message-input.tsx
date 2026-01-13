'use client';

import React, { useState, useCallback } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  onSend: (content: string) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onCancel,
  isStreaming,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState('');

  const handleSend = useCallback(() => {
    if (!content.trim() || disabled || isStreaming) return;
    onSend(content.trim());
    setContent('');
  }, [content, disabled, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={disabled || isStreaming}
          className="min-h-[60px] resize-none"
          rows={2}
          data-testid="chat-message-input"
        />
        {isStreaming ? (
          <Button
            onClick={onCancel}
            variant="destructive"
            size="icon"
            className="shrink-0"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            size="icon"
            className="shrink-0"
            data-testid="chat-send-button"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
}
