import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateBillModal } from '../../../components/bill/create-bill-modal';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ bill: { id: '1', name: 'Test' } }),
    patch: vi.fn(),
    delete: vi.fn(),
    isAuthenticated: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('CreateBillModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_open_modal_when_open_is_true', async () => {
    render(
      <CreateBillModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('create-bill-modal')).toBeInTheDocument();
    expect(await screen.findByText('Nova Conta')).toBeInTheDocument();
  });

  it('should_not_render_modal_when_open_is_false', () => {
    render(
      <CreateBillModal
        open={false}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('create-bill-modal')).not.toBeInTheDocument();
  });

  it('should_show_form_inside_modal', async () => {
    render(
      <CreateBillModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('bill-form')).toBeInTheDocument();
  });

  it('should_show_modal_description', async () => {
    render(
      <CreateBillModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText('Adicione uma nova conta fixa para este mês.')
    ).toBeInTheDocument();
  });
});
