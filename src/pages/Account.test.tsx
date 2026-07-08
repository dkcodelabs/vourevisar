import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/Profile', () => ({
  default: () => <div>Perfil mock</div>,
}));

vi.mock('@/pages/Settings', () => ({
  default: () => <div>Configurações mock</div>,
}));

vi.mock('@/components/account/AccountSubscriptionTab', () => ({
  AccountSubscriptionTab: () => <div>Assinatura mock</div>,
}));

import Account from './Account';

const renderAccount = (initialEntry = '/conta') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/conta" element={<Account />} />
    </Routes>
  </MemoryRouter>,
);

describe('Account', () => {
  it('opens the subscription tab from the query string', () => {
    renderAccount('/conta?tab=assinatura');

    expect(screen.getByRole('tab', { name: /assinatura/i })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Assinatura mock')).toBeInTheDocument();
  });
});
