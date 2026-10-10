import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiCargoSelectionStep, type AiEditalAnalysis } from './AiCargoSelectionStep';

const singleCargoAnalysis: AiEditalAnalysis = {
    edital: {
        name: 'Polícia Civil do Estado de Minas Gerais - Delegado de Polícia Substituto',
        organ: 'Polícia Civil do Estado de Minas Gerais',
        year: '2024',
        banca: 'FGV',
    },
    cargos: [
        {
            id: 'cargo-1',
            name: 'Delegado de Polícia Substituto',
        },
    ],
};

const multipleCargosAnalysis: AiEditalAnalysis = {
    edital: {
        name: 'Concurso Público TJMG',
        organ: 'TJMG',
        year: '2024',
        banca: 'IBFC',
    },
    cargos: [
        {
            id: 'cargo-1',
            name: 'Oficial Judiciário',
        },
        {
            id: 'cargo-2',
            name: 'Analista Judiciário',
        },
    ],
};

describe('AiCargoSelectionStep', () => {
    it('não renderiza badge azul repetido no cabeçalho de dados detectados', () => {
        render(
            <AiCargoSelectionStep
                analysisResult={singleCargoAnalysis}
                selectedCargoId="cargo-1"
                selectedCargoName="Delegado de Polícia Substituto"
                onSelectCargo={vi.fn()}
                iaPosition=""
                iaOrigin=""
                iaBanca=""
                missingContentSource={null}
                pdfFiles={[]}
                onAddFile={vi.fn()}
                onRemoveFile={vi.fn()}
                iaErrorMessage=""
                getAiErrorHeading={() => ''}
                pendingExtraction={null}
                onDiscardPending={vi.fn()}
            />
        );

        // Verifica que o título está presente
        expect(screen.getByText('Concurso identificado')).toBeInTheDocument();
        expect(screen.getAllByText(/Polícia Civil do Estado de Minas Gerais/i).length).toBeGreaterThanOrEqual(1);

        // O cabeçalho não deve conter span badge repetindo o cargo
        const header = screen.getByText('Concurso identificado').closest('div');
        expect(header?.querySelectorAll('span')).toHaveLength(0);
    });

    it('exibe card claro de cargo identificado quando há apenas 1 cargo no edital', () => {
        render(
            <AiCargoSelectionStep
                analysisResult={singleCargoAnalysis}
                selectedCargoId="cargo-1"
                selectedCargoName="Delegado de Polícia Substituto"
                onSelectCargo={vi.fn()}
                iaPosition=""
                iaOrigin=""
                iaBanca=""
                missingContentSource={null}
                pdfFiles={[]}
                onAddFile={vi.fn()}
                onRemoveFile={vi.fn()}
                iaErrorMessage=""
                getAiErrorHeading={() => ''}
                pendingExtraction={null}
                onDiscardPending={vi.fn()}
            />
        );

        expect(screen.getByText('Cargo identificado')).toBeInTheDocument();
        expect(screen.getByText('Delegado de Polícia Substituto')).toBeInTheDocument();
        expect(screen.getByText(/As matérias e o conteúdo programático deste cargo serão extraídos a seguir/i)).toBeInTheDocument();
        expect(screen.queryByText(/Cargos encontrados no edital/i)).not.toBeInTheDocument();
    });

    it('exibe lista de seleção quando há múltiplos cargos no edital', () => {
        const onSelectCargo = vi.fn();
        render(
            <AiCargoSelectionStep
                analysisResult={multipleCargosAnalysis}
                selectedCargoId="cargo-1"
                selectedCargoName="Oficial Judiciário"
                onSelectCargo={onSelectCargo}
                iaPosition=""
                iaOrigin=""
                iaBanca=""
                missingContentSource={null}
                pdfFiles={[]}
                onAddFile={vi.fn()}
                onRemoveFile={vi.fn()}
                iaErrorMessage=""
                getAiErrorHeading={() => ''}
                pendingExtraction={null}
                onDiscardPending={vi.fn()}
            />
        );

        expect(screen.getByText(/Cargos encontrados no edital/i)).toBeInTheDocument();
        expect(screen.getByText('2 cargos')).toBeInTheDocument();
        expect(screen.getByText('Oficial Judiciário')).toBeInTheDocument();
        expect(screen.getByText('Analista Judiciário')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Analista Judiciário'));
        expect(onSelectCargo).toHaveBeenCalledWith('cargo-2', 'Analista Judiciário');
    });

    it('exibe indicador de rascunho recuperado quando vindo do banco', () => {
        render(
            <AiCargoSelectionStep
                analysisResult={singleCargoAnalysis}
                selectedCargoId="cargo-1"
                selectedCargoName="Delegado de Polícia Substituto"
                onSelectCargo={vi.fn()}
                iaPosition=""
                iaOrigin=""
                iaBanca=""
                missingContentSource={null}
                pdfFiles={[]}
                onAddFile={vi.fn()}
                onRemoveFile={vi.fn()}
                iaErrorMessage=""
                getAiErrorHeading={() => ''}
                pendingExtraction={{
                    id: 'draft-1',
                    editalName: 'Rascunho Teste',
                    updatedAt: '2026-10-08T00:00:00Z',
                    source: 'db',
                }}
            />
        );

        expect(screen.getByText('Rascunho recuperado de sessão anterior')).toBeInTheDocument();
    });
});
