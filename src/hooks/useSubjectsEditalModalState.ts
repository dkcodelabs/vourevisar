import { useCallback, useMemo, useState } from 'react';

import type { UserEdital as EditalModalData } from '@/pages/Editais';
import type { Subject } from '@/types';

type EditalModalSource = Partial<EditalModalData> & {
  exam_date?: string;
  created_at?: string;
  updated_at?: string;
  is_imported?: boolean;
  source_id?: string;
  subject_ids?: string[];
  active_subject_ids?: string[];
  merged_with?: string[];
  merged_into_cycle?: boolean;
};

type SubjectsModalState = {
  isOpen: boolean;
  edital: EditalModalData | null;
  initialExpandedSubjectId?: string;
};

type UseSubjectsEditalModalStateInput = {
  editaisData: EditalModalSource[];
  editaisNoCiclo: EditalModalSource[];
  refresh: () => void;
  refreshData: () => void;
};

const toEditalModalData = (edital: EditalModalSource): EditalModalData => ({
  id: edital.id,
  name: edital.name,
  organ: edital.organ,
  position: edital.position,
  year: edital.year,
  examDate: edital.examDate || edital.exam_date,
  createdAt: edital.createdAt || edital.created_at || '',
  updatedAt: edital.updatedAt || edital.updated_at || '',
  isImported: edital.isImported ?? edital.is_imported ?? false,
  sourceId: edital.sourceId || edital.source_id,
  subjectIds: edital.subjectIds || edital.subject_ids || [],
  activeSubjectIds: edital.activeSubjectIds || edital.active_subject_ids || [],
  isMergedWith: edital.isMergedWith || edital.merged_with,
  mergedIntoCycle: edital.mergedIntoCycle ?? edital.merged_into_cycle ?? false,
});

export function useSubjectsEditalModalState({
  editaisData,
  editaisNoCiclo,
  refresh,
  refreshData,
}: UseSubjectsEditalModalStateInput) {
  const [subjectsModal, setSubjectsModal] = useState<SubjectsModalState>({
    edital: null,
    isOpen: false,
  });

  const editaisNoCicloModalData = useMemo(
    () => editaisNoCiclo.map(toEditalModalData),
    [editaisNoCiclo],
  );

  const handleManageCycleSubject = useCallback((subject: Subject) => {
    const edital = editaisData.find((entry) => entry.id === subject.edital_id);
    if (!edital) return;

    setSubjectsModal({
      edital: toEditalModalData(edital),
      initialExpandedSubjectId: subject.id,
      isOpen: true,
    });
  }, [editaisData]);

  const handleCloseSubjectsModal = useCallback(() => {
    setSubjectsModal({ edital: null, isOpen: false });
    refresh();
  }, [refresh]);

  const handleSubjectsModalUpdate = useCallback(() => {
    refresh();
    refreshData();
  }, [refresh, refreshData]);

  return {
    editaisNoCicloModalData,
    handleCloseSubjectsModal,
    handleManageCycleSubject,
    handleSubjectsModalUpdate,
    subjectsModal,
  };
}
