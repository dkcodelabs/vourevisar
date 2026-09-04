import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionAlert } from '@/components/ui/action-alert';

describe('ActionAlert', () => {
  it('renders a persistent warning with a link action', () => {
    render(
      <ActionAlert
        title="Depois de configurar o local, não será possível fazer mudanças"
        actionLabel="Saiba mais"
        actionHref="/ajuda"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Depois de configurar o local, não será possível fazer mudanças',
    );
    expect(screen.getByRole('link', { name: 'Saiba mais' })).toHaveAttribute(
      'href',
      '/ajuda',
    );
  });

  it('supports a button action and destructive announcement', () => {
    const onAction = vi.fn();

    render(
      <ActionAlert
        variant="destructive"
        title="Não foi possível salvar a alteração"
        description="Tente novamente sem sair desta página."
        actionLabel="Tentar novamente"
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tente novamente sem sair desta página.',
    );
    expect(onAction).toHaveBeenCalledOnce();
  });
});
