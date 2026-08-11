import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiOptionalContext } from './AiOptionalContext';
import { AiSourceStep } from './AiSourceStep';
import { ImportMethodSelector } from './ImportMethodSelector';

describe('ImportMethodSelector', () => {
  it('expõe os três métodos e troca sem esconder as alternativas', () => {
    const onChange = vi.fn();
    render(<ImportMethodSelector value="ia" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'PDF com IA' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Manual' }));
    expect(onChange).toHaveBeenCalledWith('manual');
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toBeInTheDocument();
  });
});

describe('AiSourceStep', () => {
  it('separa PDF e texto e lista edital principal com anexo', () => {
    const files = [
      new File(['principal'], 'edital.pdf', { type: 'application/pdf' }),
      new File(['anexo'], 'anexo-iii.pdf', { type: 'application/pdf' }),
    ];
    const onModeChange = vi.fn();

    render(
      <AiSourceStep
        mode="pdf"
        onModeChange={onModeChange}
        files={files}
        inputText=""
        onTextChange={vi.fn()}
        onSelectFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onAnalyze={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByText('Edital principal')).toBeInTheDocument();
    expect(screen.getByText('Anexo 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Colar texto/i }));
    expect(onModeChange).toHaveBeenCalledWith('text');
  });
});

describe('AiOptionalContext', () => {
  it('mantém o contexto fechado por padrão e mostra labels reais ao abrir', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <AiOptionalContext open={false} onOpenChange={onOpenChange} banca="" organ="" cargo="" onBancaChange={vi.fn()} onOrganChange={vi.fn()} onCargoChange={vi.fn()} />,
    );

    expect(screen.queryByText('Órgão ou concurso')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Já sabe a banca ou o cargo/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    rerender(<AiOptionalContext open onOpenChange={onOpenChange} banca="" organ="" cargo="" onBancaChange={vi.fn()} onOrganChange={vi.fn()} onCargoChange={vi.fn()} />);
    expect(screen.getByText('Banca')).toBeInTheDocument();
    expect(screen.getByText('Órgão ou concurso')).toBeInTheDocument();
    expect(screen.getByText('Cargo, área ou ênfase')).toBeInTheDocument();
  });
});
