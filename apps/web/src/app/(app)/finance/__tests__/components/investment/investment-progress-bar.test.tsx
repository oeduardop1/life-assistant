import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvestmentProgressBar } from '../../../components/investment/investment-progress-bar';

// =============================================================================
// Tests
// =============================================================================

describe('InvestmentProgressBar', () => {
  it('should_render_progress_bar_when_goal_set', () => {
    render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={30000}
      />
    );

    expect(screen.getByTestId('investment-progress-bar')).toBeInTheDocument();
  });

  it('should_not_render_when_no_goal', () => {
    const { container } = render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={null}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should_not_render_when_goal_is_zero', () => {
    const { container } = render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={0}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should_show_label_when_showLabel_is_true', () => {
    render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-percent')).toBeInTheDocument();
    expect(screen.getByTestId('investment-progress-label')).toBeInTheDocument();
  });

  it('should_not_show_label_by_default', () => {
    render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={30000}
      />
    );

    expect(screen.queryByTestId('investment-progress-percent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investment-progress-label')).not.toBeInTheDocument();
  });

  it('should_calculate_correct_percentage', () => {
    render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-percent')).toHaveTextContent('50.0%');
  });

  it('should_cap_percentage_at_100', () => {
    render(
      <InvestmentProgressBar
        currentAmount={50000}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-percent')).toHaveTextContent('100.0%');
  });

  it('should_show_meta_atingida_when_complete', () => {
    render(
      <InvestmentProgressBar
        currentAmount={30000}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-label')).toHaveTextContent('Meta atingida!');
  });

  it('should_show_da_meta_when_not_complete', () => {
    render(
      <InvestmentProgressBar
        currentAmount={15000}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-label')).toHaveTextContent('da meta');
  });

  it('should_handle_zero_current_amount', () => {
    render(
      <InvestmentProgressBar
        currentAmount={0}
        goalAmount={30000}
        showLabel
      />
    );

    expect(screen.getByTestId('investment-progress-percent')).toHaveTextContent('0.0%');
  });
});
