import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingHistory } from '../../components/tracking-history';
import { toast } from 'sonner';

// Mock the tracking hooks
vi.mock('../../hooks/use-tracking', () => ({
  useTrackingEntriesFlat: vi.fn(),
  useDeleteTrackingEntry: vi.fn(),
}));

import { useTrackingEntriesFlat, useDeleteTrackingEntry } from '../../hooks/use-tracking';
import type { TrackingEntry } from '../../types';

const mockUseTrackingEntriesFlat = vi.mocked(useTrackingEntriesFlat);
const mockUseDeleteTrackingEntry = vi.mocked(useDeleteTrackingEntry);
const mockMutateAsync = vi.fn();

// Helper to create mock entries
const createMockEntry = (overrides: Partial<TrackingEntry> = {}): TrackingEntry => ({
  id: 'entry-1',
  type: 'weight',
  area: 'health',
  subArea: null, // ADR-017: Added sub-area support
  value: '75.0',
  unit: 'kg',
  entryDate: '2024-01-15',
  entryTime: null,
  source: 'form',
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('TrackingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
    mockUseDeleteTrackingEntry.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteTrackingEntry>);
  });

  it('should_render_entries_list', () => {
    const mockEntries: TrackingEntry[] = [
      createMockEntry({ id: 'entry-1', type: 'weight', value: '75.0' }),
      createMockEntry({ id: 'entry-2', type: 'water', value: '2000', unit: 'ml' }),
      createMockEntry({ id: 'entry-3', type: 'sleep', value: '7.5', unit: 'horas' }),
    ];

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      total: 3,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Should display the history title
    expect(screen.getByText('Historico')).toBeInTheDocument();
    // Should display total count
    expect(screen.getByText('3 registros')).toBeInTheDocument();
    // Should display entries
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.getByText('Sono')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_entries', () => {
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [],
      total: 0,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_while_fetching', () => {
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [],
      total: 0,
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    const { container } = render(<TrackingHistory />);

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should_paginate_when_has_more_entries', async () => {
    const user = userEvent.setup();
    const mockFetchNextPage = vi.fn();

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [createMockEntry()],
      total: 50,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Should show "Load more" button
    const loadMoreButton = screen.getByRole('button', { name: /Carregar mais/iu });
    expect(loadMoreButton).toBeInTheDocument();

    // Click load more
    await user.click(loadMoreButton);

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('should_show_loading_state_when_fetching_next_page', () => {
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [createMockEntry()],
      total: 50,
      isLoading: false,
      isFetchingNextPage: true,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Should show loading text
    expect(screen.getByText(/Carregando.../iu)).toBeInTheDocument();
  });

  it('should_allow_delete_with_confirmation', async () => {
    const user = userEvent.setup();

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [createMockEntry({ id: 'entry-to-delete' })],
      total: 1,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /Menu/iu });
    await user.click(menuButton);

    // Click delete option in dropdown
    const deleteOption = screen.getByRole('menuitem', { name: /Remover/iu });
    await user.click(deleteOption);

    // Confirmation dialog should appear
    expect(screen.getByText('Remover registro?')).toBeInTheDocument();
    expect(screen.getByText(/Esta acao nao pode ser desfeita/iu)).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Remover/iu });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('entry-to-delete');
    });

    expect(toast.success).toHaveBeenCalledWith('Registro removido com sucesso.');
  });

  it('should_show_error_toast_on_delete_failure', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Network error'));

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [createMockEntry({ id: 'entry-fail' })],
      total: 1,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /Menu/iu });
    await user.click(menuButton);

    // Click delete option
    const deleteOption = screen.getByRole('menuitem', { name: /Remover/iu });
    await user.click(deleteOption);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Remover/iu });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao remover. Tente novamente em alguns instantes.'
      );
    });
  });

  it('should_cancel_delete_when_dialog_cancelled', async () => {
    const user = userEvent.setup();

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [createMockEntry()],
      total: 1,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /Menu/iu });
    await user.click(menuButton);

    // Click delete option
    const deleteOption = screen.getByRole('menuitem', { name: /Remover/iu });
    await user.click(deleteOption);

    // Dialog should appear
    expect(screen.getByText('Remover registro?')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancelar/iu });
    await user.click(cancelButton);

    // Should not call delete
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should_display_entry_details_correctly', () => {
    const mockEntry = createMockEntry({
      type: 'weight',
      value: '75.5',
      unit: 'kg',
      entryDate: '2024-01-15',
      source: 'form',
    });

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [mockEntry],
      total: 1,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<TrackingHistory />);

    // Should display type label
    expect(screen.getByText('Peso')).toBeInTheDocument();
    // Should display formatted value
    expect(screen.getByText('75.5 kg')).toBeInTheDocument();
    // Should display entry date
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    // Should display source label
    expect(screen.getByText('Formulário')).toBeInTheDocument();
  });
});
