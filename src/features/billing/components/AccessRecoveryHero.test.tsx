import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccessRecoveryHero } from './AccessRecoveryHero';

describe('AccessRecoveryHero', () => {
  it('explains an ended courtesy before presenting prices', () => {
    render(
      <MemoryRouter>
        <AccessRecoveryHero state={{
          kind: 'courtesy_expired',
          title: 'Sua cortesia terminou',
          description: 'Seu progresso continua salvo.',
          actionLabel: 'Escolher um plano',
          endedAt: '2026-09-04T00:00:00.000Z',
        }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Sua cortesia terminou' })).toBeInTheDocument();
    expect(screen.getByText('Terminou em 04 de setembro de 2026')).toBeInTheDocument();
    expect(screen.getByText(/progresso permanece protegido/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /escolher um plano/i })).toHaveAttribute('href', '#precos');
  });

  it('routes payment problems to account recovery instead of a new checkout', () => {
    render(
      <MemoryRouter>
        <AccessRecoveryHero state={{
          kind: 'payment_attention',
          title: 'Seu pagamento precisa de atenção',
          description: 'Regularize a cobrança.',
          actionLabel: 'Regularizar pagamento',
          endedAt: null,
        }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Regularizar pagamento' })).toHaveAttribute('href', '/conta/assinatura');
    expect(screen.queryByRole('link', { name: /escolher plano/i })).not.toBeInTheDocument();
  });
});
