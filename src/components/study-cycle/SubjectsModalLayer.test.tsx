import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  notesModal: vi.fn((props: unknown) => <div data-testid="notes-modal" data-props={JSON.stringify(Boolean(props))} />),
  importEditalModal: vi.fn((props: unknown) => <div data-testid="import-modal" data-props={JSON.stringify(Boolean(props))} />),
  difficultyRatingModal: vi.fn((props: unknown) => <div data-testid="difficulty-modal" data-props={JSON.stringify(Boolean(props))} />),
  confirmModal: vi.fn((props: {
    title: string;
    description: ReactNode;
    confirmText: string;
    cancelText: string;
  }) => (
    <div data-testid="confirm-modal">
      <h2>{props.title}</h2>
      <div>{props.description}</div>
      <button>{props.confirmText}</button>
      <button>{props.cancelText}</button>
    </div>
  )),
  editalSubjectsModal: vi.fn((props: unknown) => <div data-testid="edital-subjects-modal" data-props={JSON.stringify(Boolean(props))} />),
  cycleExamDateDialog: vi.fn((props: unknown) => <div data-testid="exam-date-dialog" data-props={JSON.stringify(Boolean(props))} />),
}));

vi.mock('@/components/reviews/NotesModal', () => ({
  default: (props: unknown) => mocks.notesModal(props),
}));

vi.mock('@/components/subjects/ImportEditalModal', () => ({
  ImportEditalModal: (props: unknown) => mocks.importEditalModal(props),
}));

vi.mock('@/components/modals/DifficultyRatingModal', () => ({
  DifficultyRatingModal: (props: unknown) => mocks.difficultyRatingModal(props),
}));

vi.mock('@/components/ui/ConfirmModal', () => ({
  default: (props: unknown) => mocks.confirmModal(props as {
    title: string;
    description: ReactNode;
    confirmText: string;
    cancelText: string;
  }),
}));

vi.mock('@/components/editais/EditalSubjectsModal', () => ({
  EditalSubjectsModal: (props: unknown) => mocks.editalSubjectsModal(props),
}));

vi.mock('@/components/study-cycle/CycleExamDateDialog', () => ({
  CycleExamDateDialog: (props: unknown) => mocks.cycleExamDateDialog(props),
}));

import { SubjectsModalLayer } from './SubjectsModalLayer';

describe('SubjectsModalLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes the cycle modals and forwards the critical props', () => {
    render(
      <SubjectsModalLayer
        closeDifficultyModal={vi.fn()}
        cycleExamDateDraft="2026-08-10"
        cycleExamDateEditorOpen={true}
        cycleExamDateError={null}
        deletePermanentConfirm={{ isOpen: false, subjectId: null, subjectName: null, editais: [] }}
        difficultyModalData={{
          currentDifficulty: null,
          duration: null,
          isCompleting: false,
          isOpen: true,
          reviewCount: 0,
          reviewStage: null,
          strategicIncidenceDescription: null,
          strategicIncidenceLabel: null,
          subjectName: 'Direito Constitucional',
          topicId: 'topic-1',
          topicName: 'Controle',
        }}
        editaisNoCiclo={[]}
        executeMarcarMateriaComoEstudada={vi.fn()}
        handleDeletePermanent={vi.fn()}
        handleDifficultyConfirmReview={vi.fn()}
        handleDifficultyDiscard={vi.fn()}
        handleDifficultyResume={vi.fn()}
        handleDifficultySubmit={vi.fn()}
        handleResetCycle={vi.fn()}
        isImportEditalModalOpen={true}
        isResettingCycle={false}
        isRevertModalOpen={true}
        isReverting={false}
        isSavingCycleExamDate={false}
        isSavingTopicReview={false}
        mainSubjectUI={<div data-testid="main-subject-ui" />}
        modalInitialTab="manual"
        onCloseImportEditalModal={vi.fn()}
        onCloseNotesModal={vi.fn()}
        onCloseRevertModal={vi.fn()}
        onCloseSubjectOriginChooser={vi.fn()}
        onCloseSubjectsModal={vi.fn()}
        onCycleExamDateOpenChange={vi.fn()}
        onDeletePermanentConfirmOpenChange={vi.fn()}
        onImportSubjects={vi.fn()}
        onResetCycleConfirmOpenChange={vi.fn()}
        onRevertMergeConfirm={vi.fn()}
        onSaveCycleExamDate={vi.fn()}
        onSetCycleExamDateDraft={vi.fn()}
        onSetUnloadConfirmOpen={vi.fn()}
        onSelectSubjectOrigin={vi.fn()}
        onSubjectsModalUpdate={vi.fn()}
        onUnloadConfirm={vi.fn()}
        completeCycleConfirmOpen={true}
        pendingCompleteSubjectId="subject-1"
        resetCycleConfirmOpen={true}
        selectedMergeName="Direito Constitucional"
        selectedMergeOriginals={[{
          editalName: 'Teste A - Cargo A',
          editalOrgan: 'Cargo A',
          subjectName: 'Direito',
        }]}
        selectedTopicForNotes={{ id: 'topic-1', name: 'Controle', subjectName: 'Direito Constitucional' }}
        setCompleteCycleConfirmOpen={vi.fn()}
        subjectOriginChooser={{
          choices: [{
            edital: {
              id: 'edital-a',
              name: 'Teste A',
              organ: 'TESTE A',
              position: 'Cargo A',
              year: '2026',
              examDate: '',
              createdAt: '',
              updatedAt: '',
              isImported: false,
              sourceId: null,
              subjectIds: ['subject-a'],
              activeSubjectIds: ['subject-a'],
              isMergedWith: [],
              mergedIntoCycle: true,
            },
            subjectId: 'subject-a',
            subjectName: 'DIREITO',
            topics: [{ displayName: 'Lei penal no tempo', topicName: 'Lei penal no tempo' }],
          }],
          isOpen: true,
          subjectName: 'DIREITO',
        }}
        subjects={[]}
        subjectsModal={{
          isOpen: true,
          edital: {
            id: 'edital-1',
            name: 'Edital PC',
            organ: 'PC',
            position: 'Escrivão',
            year: '2026',
            examDate: '',
            createdAt: '',
            updatedAt: '',
            isImported: false,
            sourceId: null,
            subjectIds: [],
            activeSubjectIds: [],
            isMergedWith: [],
            mergedIntoCycle: false,
          },
          initialExpandedSubjectId: 'subject-1',
        }}
        unloadConfirm={{ isOpen: true, editalId: 'edital-1', editalName: 'Edital PC', subjectIds: [] }}
        unloadingEditalId={null}
      />,
    );

    expect(screen.getByTestId('notes-modal')).toBeInTheDocument();
    expect(screen.getByTestId('import-modal')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('edital-subjects-modal')).toBeInTheDocument();
    expect(screen.getByTestId('exam-date-dialog')).toBeInTheDocument();

    expect(mocks.importEditalModal).toHaveBeenCalledWith(expect.objectContaining({
      initialTab: 'manual',
      isOpen: true,
      manualModeChildren: expect.anything(),
    }));

    expect(mocks.difficultyRatingModal).toHaveBeenCalledWith(expect.objectContaining({
      isOpen: true,
      onDiscard: expect.any(Function),
      onResume: expect.any(Function),
      topicName: 'Controle',
      subjectName: 'Direito Constitucional',
    }));

    expect(mocks.editalSubjectsModal).toHaveBeenCalledWith(expect.objectContaining({
      isOpen: true,
      initialExpandedSubjectId: 'subject-1',
    }));

    expect(screen.getByText('Separar matéria unificada')).toBeInTheDocument();
    expect(screen.getByText(/voltará a aparecer separada por edital no ciclo/i)).toBeInTheDocument();
    expect(screen.getByText(/progresso e o histórico já sincronizados/i)).toBeInTheDocument();
    expect(screen.getByText('Separar matéria')).toBeInTheDocument();
    expect(screen.getByText('Manter unificada')).toBeInTheDocument();
    expect(screen.getByText('Matéria unificada')).toBeInTheDocument();
    expect(screen.getByText(/junta conteúdos de mais de um edital/i)).toBeInTheDocument();
    expect(screen.getByText('Lei penal no tempo')).toBeInTheDocument();
  });
});
