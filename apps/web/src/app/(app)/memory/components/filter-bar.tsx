'use client';

import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  type ListItemsFilters,
  type KnowledgeItemType,
  type LifeArea,
  type KnowledgeItemSource,
  type ConfidenceLevel,
  knowledgeItemTypeLabels,
  lifeAreaLabels,
  sourceLabels,
  confidenceLevelLabels,
} from '../types';

interface FilterBarProps {
  filters: ListItemsFilters;
  onChange: (filters: ListItemsFilters) => void;
}

const CONFIDENCE_RANGES: Record<ConfidenceLevel, [number | undefined, number | undefined]> = {
  high: [0.8, undefined],
  medium: [0.6, 0.79],
  low: [undefined, 0.59],
};

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onChange({ ...filters, search: searchInput || undefined, offset: 0 });
    },
    [filters, onChange, searchInput]
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      const type = value === 'all' ? undefined : (value as KnowledgeItemType);
      onChange({ ...filters, type, offset: 0 });
    },
    [filters, onChange]
  );

  const handleAreaChange = useCallback(
    (value: string) => {
      const area = value === 'all' ? undefined : (value as LifeArea);
      onChange({ ...filters, area, offset: 0 });
    },
    [filters, onChange]
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      const source = value === 'all' ? undefined : (value as KnowledgeItemSource);
      onChange({ ...filters, source, offset: 0 });
    },
    [filters, onChange]
  );

  const handleConfidenceChange = useCallback(
    (value: string) => {
      if (value === 'all') {
        onChange({ ...filters, confidenceMin: undefined, confidenceMax: undefined, offset: 0 });
      } else {
        const [min, max] = CONFIDENCE_RANGES[value as ConfidenceLevel];
        onChange({ ...filters, confidenceMin: min, confidenceMax: max, offset: 0 });
      }
    },
    [filters, onChange]
  );

  const handleIncludeSupersededChange = useCallback(
    (checked: boolean) => {
      onChange({ ...filters, includeSuperseded: checked || undefined, offset: 0 });
    },
    [filters, onChange]
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onChange({ limit: filters.limit });
  }, [filters.limit, onChange]);

  const hasFilters =
    filters.type ||
    filters.area ||
    filters.source ||
    filters.confidenceMin !== undefined ||
    filters.confidenceMax !== undefined ||
    filters.search ||
    filters.includeSuperseded;

  // Determine current confidence selection
  const currentConfidence = (() => {
    if (filters.confidenceMin === 0.8) return 'high';
    if (filters.confidenceMin === 0.6 && filters.confidenceMax === 0.79) return 'medium';
    if (filters.confidenceMax === 0.59) return 'low';
    return 'all';
  })();

  return (
    <div className="space-y-3">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar conhecimentos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Buscar
        </Button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.type ?? 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(knowledgeItemTypeLabels) as KnowledgeItemType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {knowledgeItemTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.area ?? 'all'} onValueChange={handleAreaChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {(Object.keys(lifeAreaLabels) as LifeArea[]).map((area) => (
              <SelectItem key={area} value={area}>
                {lifeAreaLabels[area]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.source ?? 'all'} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {(Object.keys(sourceLabels) as KnowledgeItemSource[]).map((source) => (
              <SelectItem key={source} value={source}>
                {sourceLabels[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentConfidence} onValueChange={handleConfidenceChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Confiança" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer</SelectItem>
            {(Object.keys(confidenceLevelLabels) as ConfidenceLevel[]).map((level) => (
              <SelectItem key={level} value={level}>
                {confidenceLevelLabels[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Temporal toggle (M1.6.1) */}
        <div className="flex items-center gap-2 px-2">
          <Switch
            id="show-history"
            checked={filters.includeSuperseded ?? false}
            onCheckedChange={handleIncludeSupersededChange}
          />
          <Label htmlFor="show-history" className="text-sm text-muted-foreground whitespace-nowrap">
            Ver histórico
          </Label>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
