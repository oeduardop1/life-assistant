import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualTrackForm } from '../../components/manual-track-form';
import { toast } from 'sonner';

// Mock the useCreateTrackingEntry hook
vi.mock('../../hooks/use-tracking', () => ({
  useCreateTrackingEntry: vi.fn(),
}));

import { useCreateTrackingEntry } from '../../hooks/use-tracking';

const mockUseCreateTrackingEntry = vi.mocked(useCreateTrackingEntry);
const mockMutateAsync = vi.fn();

describe('ManualTrackForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'entry-123' });
    mockUseCreateTrackingEntry.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTrackingEntry>);
  });

  it('should_render_form_with_all_fields', () => {
    render(<ManualTrackForm open={true} onOpenChange={vi.fn()} />);

    // Check form title and description
    expect(screen.getByText('Registrar Metrica')).toBeInTheDocument();
    expect(screen.getByText(/Adicione um registro manual/iu)).toBeInTheDocument();

    // Check form fields labels exist (use getByText for Radix UI labels)
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText(/Horario/iu)).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole('button', { name: /Salvar/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/iu })).toBeInTheDocument();
  });

  it('should_have_validation_range_hints', () => {
    render(<ManualTrackForm open={true} onOpenChange={vi.fn()} defaultType="weight" />);

    // Check that validation range hint is displayed
    expect(screen.getByText(/Entre 0.1 e 500 kg/iu)).toBeInTheDocument();
  });

  it('should_not_submit_when_api_is_pending', async () => {
    mockUseCreateTrackingEntry.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof useCreateTrackingEntry>);

    render(<ManualTrackForm open={true} onOpenChange={vi.fn()} defaultType="weight" />);

    // Check that submit button shows loading state
    const submitButton = screen.getByRole('button', { name: /Salvar/iu });
    expect(submitButton).toBeDisabled();
  });

  it('should_submit_with_correct_payload', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ManualTrackForm open={true} onOpenChange={onOpenChange} defaultType="weight" />);

    // Fill in the form
    const valueInput = screen.getByRole('spinbutton', { name: /Valor/iu });
    await user.clear(valueInput);
    await user.type(valueInput, '75.5');

    // Submit
    const submitButton = screen.getByRole('button', { name: /Salvar/iu });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'weight',
          area: 'health',
          value: 75.5,
          unit: 'kg',
          source: 'form',
        })
      );
    });
  });

  it('should_reset_form_after_successful_submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ManualTrackForm open={true} onOpenChange={onOpenChange} defaultType="weight" />);

    // Fill and submit
    const valueInput = screen.getByRole('spinbutton', { name: /Valor/iu });
    await user.clear(valueInput);
    await user.type(valueInput, '75.5');

    const submitButton = screen.getByRole('button', { name: /Salvar/iu });
    await user.click(submitButton);

    await waitFor(() => {
      // Should close dialog
      expect(onOpenChange).toHaveBeenCalledWith(false);
      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith('Peso: 75.5 kg');
    });
  });

  it('should_show_error_toast_on_failure', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Network error'));

    render(<ManualTrackForm open={true} onOpenChange={vi.fn()} defaultType="weight" />);

    // Fill and submit
    const valueInput = screen.getByRole('spinbutton', { name: /Valor/iu });
    await user.clear(valueInput);
    await user.type(valueInput, '75.5');

    const submitButton = screen.getByRole('button', { name: /Salvar/iu });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao salvar. Tente novamente em alguns instantes.'
      );
    });
  });

  it('should_close_dialog_on_cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ManualTrackForm open={true} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /Cancelar/iu });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_prefill_date_when_defaultDate_is_provided', () => {
    const defaultDate = '2026-01-15';
    render(
      <ManualTrackForm
        open={true}
        onOpenChange={vi.fn()}
        defaultDate={defaultDate}
      />
    );

    const dateInput = screen.getByLabelText(/Data/iu);
    expect(dateInput).toHaveValue(defaultDate);
  });

  it('should_submit_with_provided_defaultDate', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const defaultDate = '2026-01-15';

    render(
      <ManualTrackForm
        open={true}
        onOpenChange={onOpenChange}
        defaultType="mood"
        defaultDate={defaultDate}
      />
    );

    // Fill in the value
    const valueInput = screen.getByRole('spinbutton', { name: /Valor/iu });
    await user.clear(valueInput);
    await user.type(valueInput, '8');

    // Submit
    const submitButton = screen.getByRole('button', { name: /Salvar/iu });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mood',
          entryDate: defaultDate,
        })
      );
    });
  });
});
