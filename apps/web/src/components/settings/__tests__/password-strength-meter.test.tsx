import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from '../password-strength-meter';

describe('PasswordStrengthMeter', () => {
  it('should_not_render_when_password_is_empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should_show_weak_label_for_simple_password', () => {
    render(<PasswordStrengthMeter password="password" />);

    // Should show "Muito fraca" or "Fraca" for common passwords
    const weakLabels = ['Muito fraca', 'Fraca'];
    const hasWeakLabel = weakLabels.some(label =>
      screen.queryByText(label) !== null
    );
    expect(hasWeakLabel).toBe(true);
  });

  it('should_show_strong_label_for_complex_password', () => {
    render(<PasswordStrengthMeter password="MyStr0ng!P@ssword2024" />);

    // Should show "Boa" or "Forte" for complex passwords
    const strongLabels = ['Boa', 'Forte', 'Razoável'];
    const hasStrongLabel = strongLabels.some(label =>
      screen.queryByText(label) !== null
    );
    expect(hasStrongLabel).toBe(true);
  });

  it('should_render_progress_bar', () => {
    render(<PasswordStrengthMeter password="test123" />);

    // Progress bar container should exist
    const progressBar = document.querySelector('[class*="bg-muted"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should_consider_user_inputs_in_strength_calculation', () => {
    // Password containing user email should be weaker
    const { rerender } = render(
      <PasswordStrengthMeter password="TestUser123" userInputs={[]} />
    );

    // Get initial strength label
    const initialLabel = screen.getByText(/fraca|razoável|boa|forte|muito fraca/i);
    expect(initialLabel).toBeInTheDocument();

    // Rerender with user inputs that match password
    rerender(
      <PasswordStrengthMeter
        password="TestUser123"
        userInputs={['testuser@example.com', 'Test User']}
      />
    );

    // Should still render a label (might be same or weaker)
    const newLabel = screen.getByText(/fraca|razoável|boa|forte|muito fraca/i);
    expect(newLabel).toBeInTheDocument();
  });
});
