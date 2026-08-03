import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/Profile', () => ({
  default: () => <div>Perfil mock</div>,
}));

vi.mock('@/pages/Settings', () => ({
  default: () => <div>Configurações mock</div>,
}));

import Account from './Account';

const renderAccount = (initialEntry = '/conta') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/conta" element={<Account />} />
      <Route path="/conta/assinatura" element={<div>Nova área de assinatura</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('Account', () => {
  it('keeps all account sections visible on the profile page', () => {
    renderAccount('/conta?tab=perfil');

    expect(screen.getByRole('navigation', { name: 'Seções da conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Assinatura' })).toHaveAttribute('href', '/conta/assinatura');
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/conta?tab=configuracoes');
  });

  it('redirects the legacy subscription tab URL to the isolated page', () => {
    renderAccount('/conta?tab=assinatura');

    expect(screen.getByText('Nova área de assinatura')).toBeInTheDocument();
  });
});
