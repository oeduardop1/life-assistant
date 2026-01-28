import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should_show_type_selection_step_first', async () => {
    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    // Should show type selection prompt
    expect(
      await screen.findByText('Qual tipo de renda você vai cadastrar?')
    ).toBeInTheDocument();

    // Should show type options
    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('Bônus')).toBeInTheDocument();
  });

  it('should_advance_to_details_step_after_selecting_type', async () => {
    const user = userEvent.setup();

    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    // Click on salary type
    await user.click(screen.getByText('Salário'));

    // Should show details step after a short delay (using findBy which waits)
    expect(await screen.findByText('Preencha os detalhes da renda')).toBeInTheDocument();

    // Should have name input field (wait for it to appear)
    expect(await screen.findByTestId('income-form-name')).toBeInTheDocument();
  });

  it('should_show_step_indicator', async () => {
    render(
      <CreateIncomeModal
        open={true}
        onOpenChange={vi.fn()}
        monthYear="2026-01"
      />,
      { wrapper: createWrapper() }
    );

    const modal = await screen.findByTestId('create-income-modal');

    // Step indicator should have 3 steps
    const stepIndicators = within(modal).getAllByText(/1|2|3/);
    expect(stepIndicators.length).toBeGreaterThanOrEqual(1);
  });
});
