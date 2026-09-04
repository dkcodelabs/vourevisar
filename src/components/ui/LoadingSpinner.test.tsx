import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('uses only the brand mark during full-page loading', () => {
    const { container } = render(
      <LoadingSpinner fullPage size="large" message="Verificando seu acesso..." />,
    );

    expect(screen.getByText('Verificando seu acesso...')).toBeInTheDocument();
    expect(container.querySelector('svg.brand-mark')).toBeInTheDocument();
    expect(container.querySelector('.brand-wordmark')).not.toBeInTheDocument();
  });

  it('uses the one-time entrance motion instead of a looping loader motion', () => {
    const { container } = render(<LoadingSpinner />);

    expect(container.querySelector('.brand-mark--entrance')).toBeInTheDocument();
    expect(container.querySelector('.brand-mark--loading')).not.toBeInTheDocument();
  });
});
