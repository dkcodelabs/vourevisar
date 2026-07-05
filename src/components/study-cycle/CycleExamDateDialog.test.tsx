import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleExamDateDialog } from './CycleExamDateDialog';

describe('CycleExamDateDialog', () => {
  it('edits and submits the cycle exam date without touching edital data', () => {
    const onExamDateChange = vi.fn();
    const onSave = vi.fn();

    render(
      <CycleExamDateDialog
        errorMessage={null}
        examDate="2026-07-01"
        isOpen
        isSaving={false}
        onExamDateChange={onExamDateChange}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Data da prova do ciclo', { selector: 'input' }), {
      target: { value: '2026-11-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar data' }));

    expect(onExamDateChange).toHaveBeenCalledWith('2026-11-20');
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByText(/não altera as datas dos editais individuais/i)).toBeInTheDocument();
  });

  it('shows a persistence error and locks commands while saving', () => {
    render(
      <CycleExamDateDialog
        errorMessage="Não foi possível atualizar a data da prova. Tente novamente."
        examDate=""
        isOpen
        isSaving
        onExamDateChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar');
    expect(screen.getByRole('button', { name: 'Salvando data' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
