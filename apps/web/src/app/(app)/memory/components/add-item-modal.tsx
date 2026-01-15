'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CreateKnowledgeItemInput,
  type KnowledgeItemType,
  type LifeArea,
  knowledgeItemTypeLabels,
  lifeAreaLabels,
} from '../types';

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateKnowledgeItemInput) => void;
  isSaving?: boolean;
}

interface FormData {
  type: KnowledgeItemType;
  area: LifeArea | '';
  title: string;
  content: string;
  tags: string;
}

export function AddItemModal({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: AddItemModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: 'fact',
      area: '',
      title: '',
      content: '',
      tags: '',
    },
  });

  const typeValue = watch('type');
  const areaValue = watch('area');

  const onSubmit = (data: FormData) => {
    const tags = data.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      type: data.type,
      content: data.content,
      area: data.area || undefined,
      title: data.title || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    reset();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Conhecimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={typeValue}
                onValueChange={(value) => setValue('type', value as KnowledgeItemType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(knowledgeItemTypeLabels) as KnowledgeItemType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {knowledgeItemTypeLabels[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('type', { required: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select
                value={areaValue}
                onValueChange={(value) =>
                  setValue('area', value === 'none' ? '' : (value as LifeArea))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(Object.keys(lifeAreaLabels) as LifeArea[]).map((area) => (
                    <SelectItem key={area} value={area}>
                      {lifeAreaLabels[area]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Um título descritivo..."
              {...register('title')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo *</Label>
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
              onClick={() => handleClose(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
