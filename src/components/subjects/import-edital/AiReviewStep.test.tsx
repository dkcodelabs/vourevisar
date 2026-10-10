import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiReviewStep, type AiSubject } from './AiReviewStep';

describe('AiReviewStep', () => {
  const mockAiResult: AiSubject[] = [
    {
      id: 'subj-1',
      title: 'LÍNGUA PORTUGUESA',
      selected: true,
      expanded: true,
      knowledgeType: 'Conhecimentos Básicos',
      weight: { questions: 10, points: 15, percentage: null, rawText: null },
      topics: [
        { name: 'Compreensão de texto', selected: true },
        { name: 'Ortografia oficial', selected: true },
      ],
    },
    {
      id: 'subj-2',
      title: 'DIREITO ADMINISTRATIVO',
      selected: true,
      expanded: false,
      knowledgeType: 'Conhecimentos Específicos',
      topics: [
        { name: 'Atos administrativos', selected: true },
      ],
    },
  ];

  it('renderiza metadados do edital e lista de matérias', () => {
    render(
      <AiReviewStep
        origin="POLÍCIA FEDERAL"
        onOriginChange={vi.fn()}
        position="AGENTE"
        onPositionChange={vi.fn()}
        year="2026"
        onYearChange={vi.fn()}
        examDate="2026-10-10"
        onExamDateChange={vi.fn()}
        aiResult={mockAiResult}
        onAiResultChange={vi.fn()}
        weightExtractionStatus="found"
        weightBlockInfo={[]}
        examWeightTotals={{ totalQuestions: 10, totalPoints: 15 }}
        isSaving={false}
        onConfirmImport={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('POLÍCIA FEDERAL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AGENTE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('LÍNGUA PORTUGUESA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DIREITO ADMINISTRATIVO')).toBeInTheDocument();
    expect(screen.getByText('Compreensão de texto')).toBeInTheDocument();
  });

  it('permite desmarcar matéria e acionar importação', () => {
    const onAiResultChange = vi.fn();
    const onConfirmImport = vi.fn();

    render(
      <AiReviewStep
        origin="INSS"
        onOriginChange={vi.fn()}
        position="TÉCNICO"
        onPositionChange={vi.fn()}
        year="2026"
        onExamDateChange={vi.fn()}
        examDate=""
        onYearChange={vi.fn()}
        aiResult={mockAiResult}
        onAiResultChange={onAiResultChange}
        weightExtractionStatus="idle"
        weightBlockInfo={[]}
        examWeightTotals={{ totalQuestions: 10, totalPoints: 15 }}
        isSaving={false}
        onConfirmImport={onConfirmImport}
      />
    );

    fireEvent.click(screen.getByLabelText(/Selecionar matéria LÍNGUA PORTUGUESA/i));
    expect(onAiResultChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Importar edital/i }));
    expect(onConfirmImport).toHaveBeenCalled();
  });

  it('exibe o botão Voltar ao cargo no rodapé e alerta com contraste adequado', () => {
    const onBackToCargo = vi.fn();

    render(
      <AiReviewStep
        origin="PC-SP"
        onOriginChange={vi.fn()}
        position="INVESTIGADOR"
        onPositionChange={vi.fn()}
        year="2026"
        onExamDateChange={vi.fn()}
        examDate="2026-12-01"
        onYearChange={vi.fn()}
        aiResult={mockAiResult}
        onAiResultChange={vi.fn()}
        weightExtractionStatus="not_found"
        weightBlockInfo={[]}
        examWeightTotals={{ totalQuestions: null, totalPoints: null }}
        isSaving={false}
        onConfirmImport={vi.fn()}
        onBackToCargo={onBackToCargo}
      />
    );

    expect(screen.getByText(/Peso por matéria não identificado/i)).toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: /Voltar ao cargo/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(onBackToCargo).toHaveBeenCalledOnce();
  });

  it('exibe botão Descartar rascunho no rodapé quando há rascunho ativo', () => {
    const onDiscardPending = vi.fn();

    render(
      <AiReviewStep
        origin="PC-MG"
        onOriginChange={vi.fn()}
        position="INVESTIGADOR"
        onPositionChange={vi.fn()}
        year="2024"
        onExamDateChange={vi.fn()}
        examDate=""
        onYearChange={vi.fn()}
        aiResult={mockAiResult}
        onAiResultChange={vi.fn()}
        weightExtractionStatus="idle"
        weightBlockInfo={[]}
        examWeightTotals={{ totalQuestions: null, totalPoints: null }}
        isSaving={false}
        onConfirmImport={vi.fn()}
        hasPendingDraft={true}
        onDiscardPending={onDiscardPending}
      />
    );

    const discardBtn = screen.getByRole('button', { name: /Descartar rascunho/i });
    expect(discardBtn).toBeInTheDocument();
    fireEvent.click(discardBtn);
    expect(onDiscardPending).toHaveBeenCalledOnce();
  });
});
