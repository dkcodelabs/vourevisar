import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudyCycleLoadError } from './StudyCycleLoadError';

describe('StudyCycleLoadError', () => {
  it('shows the load error and retries on user action', () => {
    const onRetry = vi.fn();

    render(<StudyCycleLoadError loadError="Não foi possível carregar o ciclo." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o ciclo.');

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
