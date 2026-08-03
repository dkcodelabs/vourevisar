import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PricingSection } from './PricingSection';

const plans = {
  monthly: { name: 'Mensal', value: 16, features: ['Acesso completo'], badge: null },
  annual: { name: 'Anual', value: 99, features: ['Acesso por 12 meses'], badge: 'Melhor custo-benefício' },
};

describe('PricingSection', () => {
  it('names disabled actions according to the current plan', () => {
    render(<PricingSection plans={plans} currentPlan="annual" onPlanSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Incluído no plano anual' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Plano atual' })).toBeDisabled();
  });

  it('explains when the annual plan is available without pretending the button works', () => {
    const onPlanSelect = vi.fn();
    render(
      <PricingSection
        plans={plans}
        currentPlan="monthly"
        annualUpgradeBlocked
        onPlanSelect={onPlanSelect}
      />,
    );

    const annualButton = screen.getByRole('button', { name: 'Disponível após o plano atual' });
    expect(annualButton).toBeDisabled();
    fireEvent.click(annualButton);
    expect(onPlanSelect).not.toHaveBeenCalled();
  });
});
