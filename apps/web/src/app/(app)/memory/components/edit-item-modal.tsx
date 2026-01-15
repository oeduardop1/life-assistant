'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { KnowledgeItem, UpdateKnowledgeItemInput } from '../types';

interface EditItemModalProps {
  item: KnowledgeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (itemId: string, data: UpdateKnowledgeItemInput) => void;
  isSaving?: boolean;
}

interface FormData {
  title: string;
  content: string;
  tags: string;
}

export function EditItemModal({
  item,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: EditItemModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      content: '',
      tags: '',
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      reset({
        title: item.title ?? '',
        content: item.content,
        tags: item.tags.join(', '),
      });
    }
  }, [item, reset]);

  const onSubmit = (data: FormData) => {
    if (!item) return;

    const tags = data.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave(item.id, {
      title: data.title || undefined,
      content: data.content,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Conhecimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Um título descritivo..."
              {...register('title')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              placeholder="O conteúdo do conhecimento..."
              rows={4}
              {...register('content', { required: 'Conteúdo é obrigatório' })}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              placeholder="exemplo, tags, aqui"
              {...register('tags')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
