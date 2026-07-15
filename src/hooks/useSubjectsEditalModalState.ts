import { useCallback, useMemo, useState } from 'react';

import type { UserEdital as EditalModalData } from '@/pages/Editais';
import type { Subject } from '@/types';
import type { CycleUnificationMap, UnifiedSubjectMapping } from '@/types/cycleMergeTypes';

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

export type SubjectOriginChoice = {
  edital: EditalModalData;
  subjectId: string;
  subjectName: string;
  topics: Array<{
    displayName: string;
    topicName: string;
  }>;
};

export type SubjectOriginChooserState = {
  isOpen: boolean;
  subjectName: string;
  choices: SubjectOriginChoice[];
};

type UseSubjectsEditalModalStateInput = {
  dynamicUnificationMap?: CycleUnificationMap | null;
  editaisData: EditalModalSource[];
  editaisNoCiclo: EditalModalSource[];
  refresh: () => void;
  refreshData: () => void;
  subjects?: Subject[];
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
  dynamicUnificationMap,
  editaisData,
  editaisNoCiclo,
  refresh,
  refreshData,
  subjects = [],
}: UseSubjectsEditalModalStateInput) {
  const [subjectsModal, setSubjectsModal] = useState<SubjectsModalState>({
    edital: null,
    isOpen: false,
  });
  const [subjectOriginChooser, setSubjectOriginChooser] = useState<SubjectOriginChooserState>({
    choices: [],
    isOpen: false,
    subjectName: '',
  });

  const editaisNoCicloModalData = useMemo(
    () => editaisNoCiclo.map(toEditalModalData),
    [editaisNoCiclo],
  );

  const findUnifiedSubjectMapping = useCallback((subject: Subject): UnifiedSubjectMapping | null => {
    const subjectIdSet = new Set([subject.id, ...subject.id.split(':')]);
    return dynamicUnificationMap?.unifiedSubjects.find(mapping => {
      const groupId = mapping.originalSubjectIds.join(':');
      return subjectIdSet.has(groupId) || mapping.originalSubjectIds.some(id => subjectIdSet.has(id));
    }) || null;
  }, [dynamicUnificationMap]);

  const buildOriginChoices = useCallback((mapping: UnifiedSubjectMapping): SubjectOriginChoice[] => {
    const subjectById = new Map(subjects.map(entry => [entry.id, entry]));
    const editalById = new Map(editaisData.map(entry => [entry.id, entry]));

    return mapping.originalSubjectIds.flatMap(subjectId => {
      const originalSubject = subjectById.get(subjectId);
      const editalId = originalSubject?.edital_id || mapping.sourceEditalIds?.find(id => {
        const edital = editalById.get(id);
        return Boolean(edital?.subject_ids?.includes(subjectId) || edital?.subjectIds?.includes(subjectId));
      });
      const edital = editalId ? editalById.get(editalId) : null;
      if (!originalSubject || !edital) return [];

      const topicById = new Map((originalSubject.topics || []).map(topic => [topic.id, topic]));
      const topics = mapping.topicMappings.flatMap(topicMapping => (
        topicMapping.originalTopicIds.flatMap(topicId => {
          const topic = topicById.get(topicId);
          if (!topic) return [];
          return [{
            displayName: topicMapping.displayName,
            topicName: topic.name,
          }];
        })
      ));

      return [{
        edital: toEditalModalData(edital),
        subjectId,
        subjectName: originalSubject.name,
        topics,
      }];
    });
  }, [editaisData, subjects]);

  const openSubjectModal = useCallback((edital: EditalModalSource | EditalModalData, subjectId: string) => {
    setSubjectsModal({
      edital: toEditalModalData(edital),
      initialExpandedSubjectId: subjectId,
      isOpen: true,
    });
  }, []);

  const handleManageCycleSubject = useCallback((subject: Subject) => {
    const unifiedMapping = findUnifiedSubjectMapping(subject);
    const originChoices = unifiedMapping ? buildOriginChoices(unifiedMapping) : [];

    if (originChoices.length > 1) {
      setSubjectOriginChooser({
        choices: originChoices,
        isOpen: true,
        subjectName: unifiedMapping?.displayNameOverride || unifiedMapping?.displayName || subject.name,
      });
      return;
    }

    const edital = editaisData.find((entry) => entry.id === subject.edital_id);
    if (!edital) return;

    openSubjectModal(edital, subject.id);
  }, [buildOriginChoices, editaisData, findUnifiedSubjectMapping, openSubjectModal]);

  const handleCloseSubjectOriginChooser = useCallback(() => {
    setSubjectOriginChooser({ choices: [], isOpen: false, subjectName: '' });
  }, []);

  const handleSelectSubjectOrigin = useCallback((choice: SubjectOriginChoice) => {
    setSubjectOriginChooser({ choices: [], isOpen: false, subjectName: '' });
    openSubjectModal(choice.edital, choice.subjectId);
  }, [openSubjectModal]);

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
    handleCloseSubjectOriginChooser,
    handleManageCycleSubject,
    handleSelectSubjectOrigin,
    handleSubjectsModalUpdate,
    subjectOriginChooser,
    subjectsModal,
  };
}
