'use client';

import { useState, useCallback } from 'react';
import { Plus, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MemoryOverviewComponent,
  FilterBar,
  KnowledgeItemsList,
  EditItemModal,
  AddItemModal,
  DeleteConfirmDialog,
} from './components';
import {
  useMemoryOverview,
  useKnowledgeItemsFlat,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useValidateItem,
  useExportMemory,
} from './hooks';
import type {
  KnowledgeItem,
  ListItemsFilters,
  CreateKnowledgeItemInput,
  UpdateKnowledgeItemInput,
} from './types';

/**
 * Memory page - View and manage what the AI knows about the user
 *
 * Features:
 * - Overview sidebar with user profile and stats
 * - Knowledge items list with filters
 * - CRUD operations for knowledge items
 * - Export functionality
 *
 * @see MILESTONES.md M1.6 for Memory View
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
export default function MemoryPage() {
  // State
  const [filters, setFilters] = useState<ListItemsFilters>({ limit: 20 });
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KnowledgeItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Queries
  const { data: overview, isLoading: isLoadingOverview } = useMemoryOverview();
  const {
    items,
    total,
    isLoading: isLoadingItems,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useKnowledgeItemsFlat(filters);

  // Mutations
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const validateItem = useValidateItem();
  const exportMemory = useExportMemory();

  // Handlers
  const handleEdit = useCallback((item: KnowledgeItem) => {
    setEditingItem(item);
  }, []);

  const handleDelete = useCallback((item: KnowledgeItem) => {
    setDeletingItem(item);
  }, []);

  const handleValidate = useCallback(
    (item: KnowledgeItem) => {
      setValidatingId(item.id);
      validateItem.mutate(item.id, {
        onSuccess: () => {
          toast.success('Conhecimento validado com sucesso');
          setValidatingId(null);
        },
        onError: () => {
          toast.error('Erro ao validar conhecimento');
          setValidatingId(null);
        },
      });
    },
    [validateItem]
  );

  const handleSaveEdit = useCallback(
    (itemId: string, data: UpdateKnowledgeItemInput) => {
      updateItem.mutate(
        { itemId, data },
        {
          onSuccess: () => {
            toast.success('Conhecimento atualizado com sucesso');
            setEditingItem(null);
          },
          onError: () => {
            toast.error('Erro ao atualizar conhecimento');
          },
        }
      );
    },
    [updateItem]
  );

  const handleConfirmDelete = useCallback(
    (itemId: string) => {
      deleteItem.mutate(itemId, {
        onSuccess: () => {
          toast.success('Conhecimento excluído com sucesso');
          setDeletingItem(null);
        },
        onError: () => {
          toast.error('Erro ao excluir conhecimento');
        },
      });
    },
    [deleteItem]
  );

  const handleCreate = useCallback(
    (data: CreateKnowledgeItemInput) => {
      createItem.mutate(data, {
        onSuccess: () => {
          toast.success('Conhecimento adicionado com sucesso');
          setIsAddModalOpen(false);
        },
        onError: () => {
          toast.error('Erro ao adicionar conhecimento');
        },
      });
    },
    [createItem]
  );

  const handleExport = useCallback(() => {
    exportMemory.mutate(undefined, {
      onSuccess: () => {
        toast.success('Exportação concluída');
      },
      onError: () => {
        toast.error('Erro ao exportar dados');
      },
    });
  }, [exportMemory]);

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Sidebar - Overview */}
      <div className="w-80 shrink-0">
        <MemoryOverviewComponent data={overview} isLoading={isLoadingOverview} />
      </div>

      {/* Main area - Knowledge Items */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Conhecimentos {total > 0 && `(${total})`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportMemory.isPending}
              >
                {exportMemory.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Exportar</span>
              </Button>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Adicionar</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-4">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <KnowledgeItemsList
            items={items}
            isLoading={isLoadingItems}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onValidate={handleValidate}
            validatingId={validatingId}
          />
        </div>
      </Card>

      {/* Modals */}
      <EditItemModal
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSave={handleSaveEdit}
        isSaving={updateItem.isPending}
      />

      <AddItemModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleCreate}
        isSaving={createItem.isPending}
      />

      <DeleteConfirmDialog
        item={deletingItem}
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteItem.isPending}
      />
    </div>
  );
}
