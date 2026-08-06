import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleEmptyState } from './CycleEmptyState';

describe('CycleEmptyState', () => {
  it('offers direct first-use paths instead of a generic edital screen', () => {
    const onOpenImport = vi.fn();
    const onGoToEditais = vi.fn();

    render(
      <CycleEmptyState
        state={{ kind: 'first_access_no_editais' }}
        onGoToEditais={onGoToEditais}
        onOpenImport={onOpenImport}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /importar com ia/i }));
    fireEvent.click(screen.getByRole('button', { name: /usar catálogo/i }));
    fireEvent.click(screen.getByRole('button', { name: /criar manualmente/i }));

    expect(onOpenImport).toHaveBeenNthCalledWith(1, 'ia');
    expect(onOpenImport).toHaveBeenNthCalledWith(2, 'ready');
    expect(onOpenImport).toHaveBeenNthCalledWith(3, 'manual');
    expect(onGoToEditais).not.toHaveBeenCalled();
  });

  it('falls back to the edital page when direct import navigation is unavailable', () => {
    const onGoToEditais = vi.fn();

    render(
      <CycleEmptyState
        state={{ kind: 'first_access_no_editais' }}
        onGoToEditais={onGoToEditais}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /importar com ia/i }));

    expect(onGoToEditais).toHaveBeenCalledTimes(1);
  });
});
