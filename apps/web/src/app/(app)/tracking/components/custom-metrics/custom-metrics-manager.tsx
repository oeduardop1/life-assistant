'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCustomMetrics } from '../../hooks';
import { lifeAreaLabels, type CustomMetricDefinition } from '../../types';
import { CreateCustomMetricModal } from './create-custom-metric-modal';
import { EditCustomMetricModal } from './edit-custom-metric-modal';
import { DeleteCustomMetricDialog } from './delete-custom-metric-dialog';

/**
 * CustomMetricsManager - Component for managing custom metric definitions
 *
 * Features:
 * - List all custom metrics
 * - Create new custom metric
 * - Edit existing custom metric
 * - Delete custom metric
 */
export function CustomMetricsManager() {
  const { data: metrics, isLoading } = useCustomMetrics();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<CustomMetricDefinition | null>(null);

  const handleEdit = (metric: CustomMetricDefinition) => {
    setSelectedMetric(metric);
    setEditModalOpen(true);
  };

  const handleDelete = (metric: CustomMetricDefinition) => {
    setSelectedMetric(metric);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Métricas Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Métricas Personalizadas
              </CardTitle>
              <CardDescription>
                Gerencie suas métricas personalizadas
              </CardDescription>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Nova Métrica
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && metrics.length > 0 ? (
            <div className="space-y-2">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                      style={{
                        backgroundColor: metric.color
                          ? `${metric.color}20`
                          : 'var(--muted)',
                      }}
                    >
                      {metric.icon}
                    </div>
                    <div>
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.unit} · {lifeAreaLabels[metric.area]}
                        {metric.minValue !== null && metric.maxValue !== null && (
                          <span className="ml-1">
                            ({metric.minValue}-{metric.maxValue})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings2 className="h-4 w-4" />
                        <span className="sr-only">Opções</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(metric)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(metric)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Settings2 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma métrica personalizada criada
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Criar primeira métrica
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCustomMetricModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <EditCustomMetricModal
        metric={selectedMetric}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <DeleteCustomMetricDialog
        metric={selectedMetric}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
