import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  notesModal: vi.fn(() => <div data-testid="notes-modal" />),
  importEditalModal: vi.fn(() => <div data-testid="import-modal" />),
  difficultyRatingModal: vi.fn(() => <div data-testid="difficulty-modal" />),
  confirmModal: vi.fn(() => <div data-testid="confirm-modal" />),
  editalSubjectsModal: vi.fn(() => <div data-testid="edital-subjects-modal" />),
  cycleExamDateDialog: vi.fn(() => <div data-testid="exam-date-dialog" />),
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
  default: (props: unknown) => mocks.confirmModal(props),
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
        onCloseSubjectsModal={vi.fn()}
        onCycleExamDateOpenChange={vi.fn()}
        onDeletePermanentConfirmOpenChange={vi.fn()}
        onImportSubjects={vi.fn()}
        onResetCycleConfirmOpenChange={vi.fn()}
        onRevertMergeConfirm={vi.fn()}
        onSaveCycleExamDate={vi.fn()}
        onSetCycleExamDateDraft={vi.fn()}
        onSetUnloadConfirmOpen={vi.fn()}
        onSubjectsModalUpdate={vi.fn()}
        onUnloadConfirm={vi.fn()}
        completeCycleConfirmOpen={true}
        pendingCompleteSubjectId="subject-1"
        resetCycleConfirmOpen={true}
        selectedMergeName="Direito Constitucional"
        selectedMergeOriginals={[]}
        selectedTopicForNotes={{ id: 'topic-1', name: 'Controle', subjectName: 'Direito Constitucional' }}
        setCompleteCycleConfirmOpen={vi.fn()}
        subjects={[]}
        subjectsModal={{
          isOpen: true,
          edital: {
            id: 'edital-1',
            name: 'Edital PC',
            organ: 'PC',
            position: 'Escrivão',
            year: 2026,
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
        unloadConfirm={{ isOpen: true, editalId: 'edital-1', editalName: 'Edital PC' }}
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
  });
});
