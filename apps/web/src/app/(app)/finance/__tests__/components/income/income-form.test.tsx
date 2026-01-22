import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncomeForm } from '../../../components/income/income-form';

// =============================================================================
// Tests
// =============================================================================

describe('IncomeForm', () => {
  it('should_render_all_form_fields', () => {
    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('income-form-name')).toBeInTheDocument();
    expect(screen.getByTestId('income-form-type')).toBeInTheDocument();
    expect(screen.getByTestId('income-form-frequency')).toBeInTheDocument();
    expect(screen.getByTestId('income-form-expected-amount')).toBeInTheDocument();
    expect(screen.getByTestId('income-form-actual-amount')).toBeInTheDocument();
    expect(screen.getByTestId('income-form-is-recurring')).toBeInTheDocument();
  });

  it('should_validate_required_name_field', async () => {
    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByTestId('income-form-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
  });

  it('should_validate_expected_amount_greater_than_zero', async () => {
    const user = userEvent.setup();

    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('income-form-name'), 'Test Income');
    await user.type(screen.getByTestId('income-form-expected-amount'), '0');

    const submitButton = screen.getByTestId('income-form-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que zero')).toBeInTheDocument();
    });
  });

  it('should_call_onCancel_when_cancel_clicked', async () => {
    const onCancel = vi.fn();

    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByTestId('income-form-cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should_pre_fill_values_when_defaultValues_provided', () => {
    render(
      <IncomeForm
        defaultValues={{
          name: 'Salário',
          type: 'salary',
          frequency: 'monthly',
          expectedAmount: 5000,
          actualAmount: 5000,
          isRecurring: true,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('income-form-name')).toHaveValue('Salário');
    expect(screen.getByTestId('income-form-expected-amount')).toHaveValue(5000);
    expect(screen.getByTestId('income-form-actual-amount')).toHaveValue(5000);
  });

  it('should_show_loading_state_when_submitting', () => {
    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />
    );

    const submitButton = screen.getByTestId('income-form-submit');
    expect(submitButton).toBeDisabled();
  });

  it('should_disable_cancel_button_when_submitting', () => {
    render(
      <IncomeForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />
    );

    const cancelButton = screen.getByTestId('income-form-cancel');
    expect(cancelButton).toBeDisabled();
  });
});
