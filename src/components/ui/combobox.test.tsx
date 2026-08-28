import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Combobox } from '@/components/ui/combobox';

describe('Combobox', () => {
  it('mantém o rótulo completo disponível quando a opção selecionada é longa', () => {
    const longLabel = 'Controle da Administração Pública: controle interno, externo, judicial e responsabilização dos agentes públicos';

    render(
      <Combobox
        options={[{ value: 'controle', label: longLabel }]}
        value="controle"
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByTitle(longLabel)).toHaveClass('truncate');
  });
});
