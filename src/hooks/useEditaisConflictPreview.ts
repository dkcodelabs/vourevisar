import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { Subject } from '@/types';
import { buildCycleMergeSources, buildCycleNameCandidates, chooseDefaultCycleExamDate } from '@/components/editais/cycleMergeNaming';
import { formatCycleSourceName, sanitizeExamDate, type CycleConflictState } from '@/utils/editaisPagePresentation';

type UseEditaisConflictPreviewInput = {
  cycleConflict: CycleConflictState;
  expandedPreviewSubjects: Set<string>;
  loadedEditalSubjects: Subject[];
  selectedCycleNameSourceIds: string[];
  setCycleExamDateDraft: Dispatch<SetStateAction<string>>;
  setCycleNameDraft: Dispatch<SetStateAction<string>>;
  setSelectedCycleNameSourceIds: Dispatch<SetStateAction<string[]>>;
  subjects: Subject[];
};

export function useEditaisConflictPreview({
  cycleConflict,
  expandedPreviewSubjects,
  loadedEditalSubjects,
  selectedCycleNameSourceIds,
  setCycleExamDateDraft,
  setCycleNameDraft,
  setSelectedCycleNameSourceIds,
  subjects,
}: UseEditaisConflictPreviewInput) {
  const finalPreviewIds = useMemo(() => {
    if (!cycleConflict.edital) return [];
    if (cycleConflict.action === 'merge' && cycleConflict.finalSubjectIds) return cycleConflict.finalSubjectIds;
    return [...new Set([...cycleConflict.existingIds, ...cycleConflict.edital.subjectIds])];
  }, [cycleConflict]);
  const replacePreviewSubjectIds = useMemo(() => subjects.filter(subject => finalPreviewIds.includes(subject.id)).map(subject => subject.id), [finalPreviewIds, subjects]);
  const areReplacePreviewSubjectsExpanded = useMemo(() => replacePreviewSubjectIds.length > 0 && replacePreviewSubjectIds.every(id => expandedPreviewSubjects.has(id)), [expandedPreviewSubjects, replacePreviewSubjectIds]);
  const cycleMergeSources = useMemo(() => cycleConflict.edital ? buildCycleMergeSources(cycleConflict.currentOrigins, cycleConflict.edital) : [], [cycleConflict.currentOrigins, cycleConflict.edital]);
  const cycleNameCandidates = useMemo(() => buildCycleNameCandidates(cycleMergeSources), [cycleMergeSources]);
  const defaultCycleExamDate = useMemo(() => chooseDefaultCycleExamDate(cycleMergeSources), [cycleMergeSources]);
  const selectedCycleNameSourceIdSet = useMemo(() => new Set(selectedCycleNameSourceIds), [selectedCycleNameSourceIds]);
  const cycleExamDateOptions = useMemo(() => {
    const byDate = new Map<string, { date: string; labels: string[] }>();
    cycleMergeSources.forEach(source => {
      const date = sanitizeExamDate(source.examDate || undefined);
      if (!date) return;
      const current = byDate.get(date) || { date, labels: [] };
      current.labels.push(source.name);
      byDate.set(date, current);
    });
    return [...byDate.values()];
  }, [cycleMergeSources]);
  const toggleCycleNameSource = useCallback((sourceId: string) => {
    const nextIds = selectedCycleNameSourceIdSet.has(sourceId) ? selectedCycleNameSourceIds.filter(id => id !== sourceId) : [...selectedCycleNameSourceIds, sourceId];
    setSelectedCycleNameSourceIds(nextIds);
    setCycleNameDraft(cycleMergeSources.filter(source => nextIds.includes(source.id)).map(source => formatCycleSourceName(source.name)).join(' + '));
  }, [cycleMergeSources, selectedCycleNameSourceIdSet, selectedCycleNameSourceIds, setCycleNameDraft, setSelectedCycleNameSourceIds]);
  const successCycleStats = useMemo(() => {
    const subjectIds = cycleConflict.action === 'replace' ? (cycleConflict.edital?.subjectIds || []) : (finalPreviewIds.length > 0 ? finalPreviewIds : (cycleConflict.edital?.subjectIds || []));
    return { subjects: subjectIds.length, topics: subjectIds.reduce((total, id) => total + ((loadedEditalSubjects.find(subject => subject.id === id) || subjects.find(subject => subject.id === id))?.topics?.length || 0), 0) };
  }, [cycleConflict.action, cycleConflict.edital?.subjectIds, finalPreviewIds, loadedEditalSubjects, subjects]);
  const successCycleSources = useMemo(() => cycleConflict.action === 'replace' && cycleConflict.edital ? [{ id: cycleConflict.edital.id, name: cycleConflict.edital.organ || cycleConflict.edital.name, position: cycleConflict.edital.position }] : cycleMergeSources, [cycleConflict.action, cycleConflict.edital, cycleMergeSources]);

  useEffect(() => {
    if (cycleConflict.step !== 'success') return;
    if (cycleConflict.action === 'replace') {
      setSelectedCycleNameSourceIds([]);
      setCycleNameDraft(cycleConflict.edital?.name || 'Ciclo de estudos');
      setCycleExamDateDraft(sanitizeExamDate(cycleConflict.edital?.examDate) || '');
      return;
    }
    setSelectedCycleNameSourceIds(current => current.length > 0 ? current : cycleMergeSources.map(source => source.id));
    setCycleNameDraft(current => current.trim() || cycleMergeSources.map(source => formatCycleSourceName(source.name)).join(' + ') || cycleNameCandidates[0] || cycleConflict.edital?.name || 'Ciclo de estudos');
    setCycleExamDateDraft(current => sanitizeExamDate(current) || defaultCycleExamDate || '');
  }, [cycleConflict.action, cycleConflict.edital?.examDate, cycleConflict.edital?.name, cycleConflict.step, cycleMergeSources, cycleNameCandidates, defaultCycleExamDate, setCycleExamDateDraft, setCycleNameDraft, setSelectedCycleNameSourceIds]);

  return { areReplacePreviewSubjectsExpanded, cycleExamDateOptions, cycleMergeSources, cycleNameCandidates, defaultCycleExamDate, finalPreviewIds, replacePreviewSubjectIds, selectedCycleNameSourceIdSet, successCycleSources, successCycleStats, toggleCycleNameSource };
}
