import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingEmptyState } from '../../components/tracking-empty-state';

describe('TrackingEmptyState', () => {
  it('should_render_empty_message', () => {
    render(<TrackingEmptyState />);

    // Check title and description
    expect(screen.getByText('Comece a registrar suas metricas')).toBeInTheDocument();
    expect(
      screen.getByText(/Acompanhe seu peso, agua, sono, exercicios, humor e energia/iu)
    ).toBeInTheDocument();
  });

  it('should_render_cta_to_start_tracking', async () => {
    const user = userEvent.setup();
    const mockOnOpenForm = vi.fn();

    render(<TrackingEmptyState onOpenForm={mockOnOpenForm} />);

    // Check CTA buttons exist
    const chatLink = screen.getByRole('link', { name: /Registrar via Chat/iu });
    expect(chatLink).toBeInTheDocument();
    expect(chatLink).toHaveAttribute('href', '/chat');

    const manualButton = screen.getByRole('button', { name: /Registrar Manualmente/iu });
    expect(manualButton).toBeInTheDocument();

    // Click manual button and verify callback
    await user.click(manualButton);
    expect(mockOnOpenForm).toHaveBeenCalledTimes(1);
  });
});
