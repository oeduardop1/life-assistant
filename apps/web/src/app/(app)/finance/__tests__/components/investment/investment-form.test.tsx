import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvestmentForm } from '../../../components/investment/investment-form';

// =============================================================================
// Tests
// =============================================================================

describe('InvestmentForm', () => {
  it('should_render_form_with_all_fields', () => {
    render(
      <InvestmentForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-name')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-type')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-current-amount')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-goal-amount')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-deadline')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-monthly-contribution')).toBeInTheDocument();
  });

  it('should_render_submit_and_cancel_buttons', () => {
    render(
      <InvestmentForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form-submit')).toBeInTheDocument();
    expect(screen.getByTestId('investment-form-cancel')).toBeInTheDocument();
  });

  it('should_call_onCancel_when_cancel_clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <InvestmentForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByTestId('investment-form-cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('should_show_validation_error_when_name_empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InvestmentForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('investment-form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
  });

  it('should_call_onSubmit_with_valid_data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InvestmentForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('investment-form-name'), 'Meu Investimento');
    await user.clear(screen.getByTestId('investment-form-current-amount'));
    await user.type(screen.getByTestId('investment-form-current-amount'), '5000');
    await user.click(screen.getByTestId('investment-form-submit'));

    expect(onSubmit).toHaveBeenCalled();
    const callArgs = onSubmit.mock.calls[0][0];
    expect(callArgs.name).toBe('Meu Investimento');
    expect(callArgs.currentAmount).toBe(5000);
    expect(callArgs.type).toBe('emergency_fund');
  });

  it('should_populate_default_values', () => {
    render(
      <InvestmentForm
        defaultValues={{
          name: 'Reserva',
          type: 'emergency_fund',
          currentAmount: 10000,
          goalAmount: 50000,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form-name')).toHaveValue('Reserva');
    expect(screen.getByTestId('investment-form-current-amount')).toHaveValue(10000);
    expect(screen.getByTestId('investment-form-goal-amount')).toHaveValue(50000);
  });

  it('should_disable_buttons_when_submitting', () => {
    render(
      <InvestmentForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />
    );

    expect(screen.getByTestId('investment-form-submit')).toBeDisabled();
    expect(screen.getByTestId('investment-form-cancel')).toBeDisabled();
  });

  it('should_show_salvar_text_on_submit_button', () => {
    render(
      <InvestmentForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form-submit')).toHaveTextContent('Salvar');
  });
});
