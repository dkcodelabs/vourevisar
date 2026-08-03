import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WifiOff } from 'lucide-react';
import { PremiumStateCard } from './PremiumStateCard';

describe('PremiumStateCard', () => {
  it('does not reload while an online-only action is offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const onAction = vi.fn();

    render(
      <PremiumStateCard
        icon={WifiOff}
        title="Sem conexão"
        description="Tente novamente quando a rede voltar."
        actionLabel="Tentar novamente"
        onAction={onAction}
        requiresOnline
      />,
    );

    const button = screen.getByRole('button', { name: 'Aguardando conexão' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
});
