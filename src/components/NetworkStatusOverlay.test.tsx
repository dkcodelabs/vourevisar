import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NetworkStatusOverlay } from './NetworkStatusOverlay';

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
};

describe('NetworkStatusOverlay', () => {
  afterEach(() => {
    setOnline(true);
  });

  it('exibe recuperação quando uma carga de dados falha mesmo com a rede ativa', () => {
    setOnline(true);

    render(<NetworkStatusOverlay appError="Erro ao carregar dados" />);

    expect(screen.getByRole('heading', { name: /não consegui buscar os dados/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('aguarda a conexão voltar antes de permitir a tentativa offline', async () => {
    setOnline(false);
    render(<NetworkStatusOverlay />);

    const button = screen.getByRole('button', { name: 'Aguardando conexão' });
    expect(button).toBeDisabled();

    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());

  });
});
