import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLoadingState } from './PageLoadingState';

describe('PageLoadingState', () => {
  it('keeps a local page frame without rendering a spinner', () => {
    const { container } = render(<PageLoadingState label="Carregando editais" rows={2} />);

    expect(screen.getByLabelText('Carregando editais')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.animate-spin')).toHaveLength(0);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(10);
  });
});
