import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateIncomeModal } from '../../../components/income/create-income-modal';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ income: { id: '1', name: 'Test' } }),
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

describe('CreateIncomeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_open_modal_when_open_is_true', async () => {
    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('create-income-modal')).toBeInTheDocument();
    expect(await screen.findByText('Nova Renda')).toBeInTheDocument();
  });

  it('should_not_render_modal_when_open_is_false', () => {
    render(
      <CreateIncomeModal
        open={false}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('create-income-modal')).not.toBeInTheDocument();
  });

  it('should_show_form_inside_modal', async () => {
    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('income-form')).toBeInTheDocument();
  });

  it('should_show_modal_description', async () => {
    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText('Adicione uma nova fonte de renda para este mês.')
    ).toBeInTheDocument();
  });
});
