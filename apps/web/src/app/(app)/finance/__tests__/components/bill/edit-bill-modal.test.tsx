import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditBillModal } from '../../../components/bill/edit-bill-modal';
import type { Bill } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn().mockResolvedValue({ bill: { id: '1', name: 'Updated' } }),
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
// Test Data
// =============================================================================

const mockBill: Bill = {
  id: 'bill-1',
  userId: 'user-1',
  name: 'Aluguel',
  category: 'housing',
  amount: 1500,
  dueDay: 10,
  status: 'pending',
  paidAt: null,
  isRecurring: true,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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

describe('EditBillModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_open_modal_when_bill_provided_and_open_is_true', async () => {
    render(
      <EditBillModal
        bill={mockBill}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('edit-bill-modal')).toBeInTheDocument();
    expect(await screen.findByText('Editar Conta')).toBeInTheDocument();
  });

  it('should_not_render_when_bill_is_null', () => {
    render(
      <EditBillModal
        bill={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('edit-bill-modal')).not.toBeInTheDocument();
  });

  it('should_pre_fill_form_with_bill_data', async () => {
    render(
      <EditBillModal
        bill={mockBill}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('bill-form-name')).toHaveValue('Aluguel');
    expect(await screen.findByTestId('bill-form-amount')).toHaveValue(1500);
    expect(await screen.findByTestId('bill-form-due-day')).toHaveValue(10);
  });

  it('should_show_description', async () => {
    render(
      <EditBillModal
        bill={mockBill}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText('Atualize as informações da conta.')
    ).toBeInTheDocument();
  });
});
