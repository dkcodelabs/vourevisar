import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CycleNewEditalSection } from './CycleNewEditalSection';
import type { Subject } from '@/types';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

const cycleConflict: CycleConflictState = {
  isOpen: true,
  edital: { id: 'edital-1', name: 'Edital de teste', createdAt: '', updatedAt: '', isImported: false, subjectIds: ['subject-1', 'subject-2'], activeSubjectIds: [] },
  existingIds: [], currentOrigins: [], step: 'select', action: 'replace', selectedSubjectIds: ['subject-1', 'subject-2'],
};

const subjects = [
  { id: 'subject-1', name: 'Português', topics: [{ id: 'topic-1', name: 'Interpretação' }] },
  { id: 'subject-2', name: 'Matemática', topics: [{ id: 'topic-2', name: 'Conjuntos' }] },
] as unknown as Subject[];

describe('CycleNewEditalSection', () => {
  it('keeps all subjects selected by default and only exposes the checklist on request', () => {
    const onToggleSubjectSelection = vi.fn();
    render(<CycleNewEditalSection cycleConflict={cycleConflict} subjects={subjects} loadedEditalSubjects={subjects} progressChoiceCard={null} mergeProgressNoticeCard={null} onToggleDetailedPreview={vi.fn()} onToggleSubjectSelection={onToggleSubjectSelection} onSelectAllSubjects={vi.fn()} onToggleSelectedSubject={vi.fn()} />);

    expect(screen.getByText('2 de 2 matérias no ciclo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Incluir Português no ciclo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher matérias' }));
    expect(onToggleSubjectSelection).toHaveBeenCalledOnce();
  });

  it('lets the student change an individual subject after opening the checklist', () => {
    const onToggleSelectedSubject = vi.fn();
    render(<CycleNewEditalSection cycleConflict={{ ...cycleConflict, isSubjectSelectionOpen: true }} subjects={subjects} loadedEditalSubjects={subjects} progressChoiceCard={null} mergeProgressNoticeCard={null} onToggleDetailedPreview={vi.fn()} onToggleSubjectSelection={vi.fn()} onSelectAllSubjects={vi.fn()} onToggleSelectedSubject={onToggleSelectedSubject} />);

    fireEvent.click(screen.getByLabelText('Incluir Português no ciclo'));
    expect(onToggleSelectedSubject).toHaveBeenCalledWith('subject-1');
  });
});
