import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

export function useCycleSubjectSelection(setCycleConflict: Dispatch<SetStateAction<CycleConflictState>>) {
  const onToggleSubjectSelection = useCallback(() => {
    setCycleConflict(previous => ({ ...previous, isSubjectSelectionOpen: !previous.isSubjectSelectionOpen }));
  }, [setCycleConflict]);

  const onSelectAllSubjects = useCallback(() => {
    setCycleConflict(previous => ({ ...previous, selectedSubjectIds: previous.edital?.subjectIds || [] }));
  }, [setCycleConflict]);

  const onToggleSelectedSubject = useCallback((subjectId: string) => {
    setCycleConflict(previous => {
      const selected = new Set(previous.selectedSubjectIds || previous.edital?.subjectIds || []);
      if (selected.has(subjectId)) selected.delete(subjectId);
      else selected.add(subjectId);
      return { ...previous, selectedSubjectIds: [...selected] };
    });
  }, [setCycleConflict]);

  return { onToggleSubjectSelection, onSelectAllSubjects, onToggleSelectedSubject };
}
