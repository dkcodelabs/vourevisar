import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadyEditalCatalog, type ReadyEdital } from './ReadyEditalCatalog';

describe('ReadyEditalCatalog', () => {
  const mockEditais: ReadyEdital[] = [
    {
      id: 'edital-1',
      organ: 'RECEITA FEDERAL',
      position: 'AUDITOR FISCAL',
      year: '2024',
      category: 'Administrativo',
      exam_board: 'FGV',
      subjects: [
        {
          name: 'DIREITO TRIBUTÁRIO',
          topics: [{ name: 'Impostos' }],
        },
      ],
    },
    {
      id: 'edital-2',
      organ: 'POLÍCIA RODOVIÁRIA FEDERAL',
      position: 'POLICIAL RODOVIÁRIO',
      year: '2021',
      category: 'Carreiras Policiais',
      exam_board: 'Cebraspe',
      subjects: [],
    },
  ];

  it('renderiza os editais e filtra por busca de texto', () => {
    render(
      <ReadyEditalCatalog
        editais={mockEditais}
        userEditalSourceIds={new Set(['edital-1'])}
        onImportEdital={vi.fn()}
        importingEditalId={null}
        onSwitchToIa={vi.fn()}
        onSwitchToManual={vi.fn()}
      />
    );

    expect(screen.getByText('RECEITA FEDERAL')).toBeInTheDocument();
    expect(screen.getByText('POLÍCIA RODOVIÁRIA FEDERAL')).toBeInTheDocument();
    expect(screen.getByText(/Já importado/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar por concurso/i);
    fireEvent.change(searchInput, { target: { value: 'Rodoviária' } });

    expect(screen.queryByText('RECEITA FEDERAL')).not.toBeInTheDocument();
    expect(screen.getByText('POLÍCIA RODOVIÁRIA FEDERAL')).toBeInTheDocument();
  });

  it('exibe estado vazio com ações alternativas ao buscar concurso inexistente', () => {
    const onSwitchToIa = vi.fn();
    const onSwitchToManual = vi.fn();

    render(
      <ReadyEditalCatalog
        editais={mockEditais}
        userEditalSourceIds={new Set()}
        onImportEdital={vi.fn()}
        importingEditalId={null}
        onSwitchToIa={onSwitchToIa}
        onSwitchToManual={onSwitchToManual}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por concurso/i);
    fireEvent.change(searchInput, { target: { value: 'Concurso Inexistente 123' } });

    expect(screen.getByText(/Nenhum resultado para "Concurso Inexistente 123"/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Importar com IA/i }));
    expect(onSwitchToIa).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Criar Manualmente/i }));
    expect(onSwitchToManual).toHaveBeenCalled();
  });
});
