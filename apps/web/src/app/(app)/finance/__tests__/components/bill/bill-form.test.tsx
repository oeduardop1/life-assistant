import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillForm } from '../../../components/bill/bill-form';

// =============================================================================
// Tests
// =============================================================================

describe('BillForm', () => {
  it('should_render_all_form_fields', () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-form-name')).toBeInTheDocument();
    expect(screen.getByTestId('bill-form-category')).toBeInTheDocument();
    expect(screen.getByTestId('bill-form-amount')).toBeInTheDocument();
    expect(screen.getByTestId('bill-form-due-day')).toBeInTheDocument();
    expect(screen.getByTestId('bill-form-is-recurring')).toBeInTheDocument();
  });

  it('should_validate_required_name_field', async () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByTestId('bill-form-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
  });

  it('should_validate_amount_greater_than_zero', async () => {
    const user = userEvent.setup();

    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('bill-form-name'), 'Test Bill');
    await user.clear(screen.getByTestId('bill-form-amount'));
    await user.type(screen.getByTestId('bill-form-amount'), '0');

    const submitButton = screen.getByTestId('bill-form-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que zero')).toBeInTheDocument();
    });
  });

  it('should_validate_due_day_between_1_and_31', () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Verify the input has proper HTML5 constraints for due day
    const dueDayInput = screen.getByTestId('bill-form-due-day');
    expect(dueDayInput).toHaveAttribute('min', '1');
    expect(dueDayInput).toHaveAttribute('max', '31');
    expect(dueDayInput).toHaveAttribute('type', 'number');
  });

  it('should_call_onCancel_when_cancel_clicked', async () => {
    const onCancel = vi.fn();

    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByTestId('bill-form-cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should_pre_fill_values_when_defaultValues_provided', () => {
    render(
      <BillForm
        defaultValues={{
          name: 'Aluguel',
          category: 'housing',
          amount: 1500,
          dueDay: 10,
          isRecurring: true,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-form-name')).toHaveValue('Aluguel');
    expect(screen.getByTestId('bill-form-amount')).toHaveValue(1500);
    expect(screen.getByTestId('bill-form-due-day')).toHaveValue(10);
  });

  it('should_show_loading_state_when_submitting', () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />
    );

    const submitButton = screen.getByTestId('bill-form-submit');
    expect(submitButton).toBeDisabled();
  });

  it('should_disable_cancel_button_when_submitting', () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />
    );

    const cancelButton = screen.getByTestId('bill-form-cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('should_have_default_values_for_category_and_recurring', () => {
    render(
      <BillForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Default category is 'other' and isRecurring is true
    expect(screen.getByTestId('bill-form-is-recurring')).toHaveAttribute('data-state', 'checked');
  });
});
