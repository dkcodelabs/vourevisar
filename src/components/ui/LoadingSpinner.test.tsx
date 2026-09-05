import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('uses a neutral progress indicator during full-page loading', () => {
    const { container } = render(
      <LoadingSpinner fullPage size="large" message="Verificando seu acesso..." />,
    );

    expect(screen.getByText('Verificando seu acesso...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Verificando seu acesso...' })).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-loader-circle')).toBeInTheDocument();
    expect(container.querySelector('svg.brand-mark')).not.toBeInTheDocument();
  });

  it('does not mount the brand animation for local loading states', () => {
    const { container } = render(<LoadingSpinner />);

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(container.querySelector('.brand-mark--entrance')).not.toBeInTheDocument();
  });
});
