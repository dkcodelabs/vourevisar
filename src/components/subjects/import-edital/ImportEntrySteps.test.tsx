import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiOptionalContext } from './AiOptionalContext';
import { AiContentSourceRecovery } from './AiContentSourceRecovery';
import { AiSourceStep } from './AiSourceStep';
import { ImportJourneyProgress } from './ImportJourneyProgress';
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
  it('mostra o arquivo selecionado e permite trocar para texto', () => {
    const files = [
      new File(['principal'], 'edital.pdf', { type: 'application/pdf' }),
    ];
    const onModeChange = vi.fn();
    const onRemoveFile = vi.fn();

    render(
      <AiSourceStep
        mode="pdf"
        onModeChange={onModeChange}
        files={files}
        inputText=""
        onTextChange={vi.fn()}
        onSelectFiles={vi.fn()}
        onRemoveFile={onRemoveFile}
        onAnalyze={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByText('edital.pdf')).toBeInTheDocument();
    expect(screen.getByText(/PDF pronto para análise/i)).toBeInTheDocument();
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

describe('ImportJourneyProgress', () => {
  it('substitui a troca de método pela etapa atual e permite retornar na etapa de cargo', () => {
    const onSecondaryAction = vi.fn();
    render(<ImportJourneyProgress stage="selectCargo" onSecondaryAction={onSecondaryAction} />);

    expect(screen.getByRole('list', { name: 'Progresso da importação' })).toBeInTheDocument();
    expect(screen.getByText('Cargo').closest('li')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar documento' }));
    expect(onSecondaryAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole('tab', { name: 'Manual' })).not.toBeInTheDocument();
  });
});

describe('AiContentSourceRecovery', () => {
  it('mostra o anexo confirmado e associa o arquivo ao cargo preservado', () => {
    const files = [
      new File(['principal'], 'edital.pdf', { type: 'application/pdf', lastModified: 1 }),
      new File(['anexo'], 'anexo-iii.pdf', { type: 'application/pdf', lastModified: 2 }),
    ];
    const onRemove = vi.fn();

    render(
      <AiContentSourceRecovery
        message="O edital referencia o Anexo III."
        files={files}
        originalFileCount={1}
        selectedCargoName="Analista"
        onAdd={vi.fn()}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('O conteúdo está em outro arquivo')).toBeInTheDocument();
    expect(screen.getByText('Anexo adicionado')).toBeInTheDocument();
    expect(screen.getByText('anexo-iii.pdf')).toBeInTheDocument();
    expect(screen.getByText('Será usado para Analista')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover anexo-iii.pdf' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('pede o documento sem usar linguagem de erro quando nenhum anexo foi adicionado', () => {
    const onAdd = vi.fn();
    render(
      <AiContentSourceRecovery
        message="O edital informa onde o conteúdo foi publicado."
        files={[new File(['principal'], 'edital.pdf', { type: 'application/pdf' })]}
        originalFileCount={1}
        selectedCargoName=""
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar o anexo indicado' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });
});
