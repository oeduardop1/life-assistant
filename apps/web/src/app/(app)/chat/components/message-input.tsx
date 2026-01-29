'use client';

import React, { useState, useCallback } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
  const [isFocused, setIsFocused] = useState(false);

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
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'p-4 border-t bg-chat-bg',
        'transition-shadow duration-200',
        isFocused && 'shadow-[0_-4px_20px_-4px_rgba(139,92,246,0.15)]'
      )}
    >
      <div
        className={cn(
          'flex gap-2 p-2 rounded-2xl',
          'bg-chat-input-bg border border-chat-input-border',
          'transition-all duration-200',
          isFocused && 'border-chat-input-focus ring-2 ring-chat-input-focus/20'
        )}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Digite sua mensagem..."
          disabled={disabled || isStreaming}
          className={cn(
            'min-h-[44px] max-h-[200px] resize-none',
            'border-0 bg-transparent focus-visible:ring-0',
            'placeholder:text-muted-foreground/60'
          )}
          rows={1}
          data-testid="chat-message-input"
        />
        {isStreaming ? (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="icon"
            className="shrink-0 self-end text-destructive hover:bg-destructive/10"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            size="icon"
            className={cn(
              'shrink-0 self-end rounded-xl',
              'bg-chat-accent hover:bg-chat-accent/90',
              'text-chat-accent-foreground',
              'disabled:opacity-40'
            )}
            data-testid="chat-send-button"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-2 text-center">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </motion.div>
  );
}
