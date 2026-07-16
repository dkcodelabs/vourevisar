import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleWorkspaceHeader } from './CycleWorkspaceHeader';

const baseProps = {
  allExpanded: false,
  canToggleAll: true,
  count: 4,
  isCycleMode: true,
  onToggleAll: vi.fn(),
  reorderControl: <button type="button">Organizar</button>,
  searchControl: <input aria-label="Buscar" />,
  title: 'Ciclo Polícia',
  viewModeControl: <button type="button">Modo edital</button>,
};

describe('CycleWorkspaceHeader', () => {
  it('edits the cycle display name inline without saving on cancel', () => {
    const onRenameCycle = vi.fn();

    render(
      <CycleWorkspaceHeader
        {...baseProps}
        onRenameCycle={onRenameCycle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar nome do ciclo' }));

    expect(screen.getByLabelText('Nome do ciclo')).toHaveValue('Ciclo Polícia');
    expect(screen.getByRole('button', { name: 'Salvar nome do ciclo' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome do ciclo'), {
      target: { value: 'Ciclo PM' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição do nome do ciclo' }));

    expect(onRenameCycle).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Nome do ciclo')).not.toBeInTheDocument();
    expect(screen.getByText('Ciclo Polícia')).toBeInTheDocument();
  });
});
