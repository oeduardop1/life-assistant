import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecurringScopeDialog } from '../../components/recurring-scope-dialog';

// =============================================================================
// Tests
// =============================================================================

describe('RecurringScopeDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Excluir item recorrente',
    description: 'Escolha o escopo da exclusão.',
    actionLabel: 'Excluir',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_title_and_description', async () => {
    render(<RecurringScopeDialog {...defaultProps} />);

    expect(await screen.findByText('Excluir item recorrente')).toBeInTheDocument();
    expect(await screen.findByText('Escolha o escopo da exclusão.')).toBeInTheDocument();
  });

  it('should_render_three_scope_options', async () => {
    render(<RecurringScopeDialog {...defaultProps} />);

    expect(await screen.findByTestId('scope-option-this')).toBeInTheDocument();
    expect(await screen.findByTestId('scope-option-future')).toBeInTheDocument();
    expect(await screen.findByTestId('scope-option-all')).toBeInTheDocument();
  });

  it('should_render_scope_labels', async () => {
    render(<RecurringScopeDialog {...defaultProps} />);

    expect(await screen.findByText('Apenas este mês')).toBeInTheDocument();
    expect(await screen.findByText('Este e futuros')).toBeInTheDocument();
    expect(await screen.findByText('Todos')).toBeInTheDocument();
  });

  it('should_have_this_scope_selected_by_default', async () => {
    render(<RecurringScopeDialog {...defaultProps} />);

    const thisRadio = await screen.findByTestId('scope-option-this');
    const radio = thisRadio.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('should_call_onConfirm_with_selected_scope_on_confirm', async () => {
    const onConfirm = vi.fn();
    render(<RecurringScopeDialog {...defaultProps} onConfirm={onConfirm} />);

    // Select 'future' scope
    const futureOption = await screen.findByTestId('scope-option-future');
    const futureRadio = futureOption.querySelector('input[type="radio"]') as HTMLInputElement;
    fireEvent.click(futureRadio);

    // Confirm
    const confirmButton = await screen.findByTestId('recurring-scope-confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('future');
  });

  it('should_call_onConfirm_with_this_scope_by_default', async () => {
    const onConfirm = vi.fn();
    render(<RecurringScopeDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = await screen.findByTestId('recurring-scope-confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('this');
  });

  it('should_call_onConfirm_with_all_scope', async () => {
    const onConfirm = vi.fn();
    render(<RecurringScopeDialog {...defaultProps} onConfirm={onConfirm} />);

    const allOption = await screen.findByTestId('scope-option-all');
    const allRadio = allOption.querySelector('input[type="radio"]') as HTMLInputElement;
    fireEvent.click(allRadio);

    const confirmButton = await screen.findByTestId('recurring-scope-confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('all');
  });

  it('should_render_custom_action_label', async () => {
    render(<RecurringScopeDialog {...defaultProps} actionLabel="Salvar" />);

    const confirmButton = await screen.findByTestId('recurring-scope-confirm');
    expect(confirmButton).toHaveTextContent('Salvar');
  });

  it('should_render_cancel_button', async () => {
    render(<RecurringScopeDialog {...defaultProps} />);

    expect(await screen.findByTestId('recurring-scope-cancel')).toBeInTheDocument();
  });

  it('should_disable_buttons_when_isPending', async () => {
    render(<RecurringScopeDialog {...defaultProps} isPending={true} />);

    const cancelButton = await screen.findByTestId('recurring-scope-cancel');
    const confirmButton = await screen.findByTestId('recurring-scope-confirm');

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('should_not_render_when_open_is_false', () => {
    render(<RecurringScopeDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('recurring-scope-dialog')).not.toBeInTheDocument();
  });
});
