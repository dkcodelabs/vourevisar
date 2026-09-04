import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subject } from '@/types';
import type { CycleConflictState, CycleOrigin, PendingMergeDraft, UserEdital } from '@/utils/editaisPagePresentation';
import { errorService } from '@/lib/errors/errorService';
import { fetchEditalSubjectsWithTopics, fetchUserCycleForEditalMerge } from '@/services/editaisPageService';
import { buildCycleOriginSources } from '@/components/editais/cycleMergeNaming';
import { buildEditalProgressSummary } from '@/utils/editalProgressSummary';
import { getPendingMergeForCycleLoad } from '@/utils/cycleLoadPendingMerge';
import { isManualCycleOrigin, parseCycleUnificationMap } from '@/utils/editaisPagePresentation';

export const useEditalCycleLoad = ({ canRunCycleStructuralOperation, discardPendingMerge, editais, pendingMerges, setCycleConflict, setIsRecoveringMerge, setLoadedEditalSubjects, setProcessingId, subjects, userId }: {
  canRunCycleStructuralOperation: () => boolean; discardPendingMerge: (id: string) => Promise<void>; editais: UserEdital[]; pendingMerges: Record<string, PendingMergeDraft | undefined>; setCycleConflict: Dispatch<SetStateAction<CycleConflictState>>; setIsRecoveringMerge: Dispatch<SetStateAction<boolean>>; setLoadedEditalSubjects: Dispatch<SetStateAction<Subject[]>>; setProcessingId: Dispatch<SetStateAction<string | null>>; subjects: Subject[]; userId?: string;
}) => {
  const handleLoadCycle = useCallback(async (edital: UserEdital, options: { ignorePendingMerge?: boolean } = {}) => {
    if (!canRunCycleStructuralOperation() || !userId) return;
    setProcessingId(edital.id);
    try {
      const pending = getPendingMergeForCycleLoad(pendingMerges, edital.id, options);
      if (pending) { setIsRecoveringMerge(true); setCycleConflict({ isOpen: true, edital, existingIds: pending.existingIds ?? [], currentOrigins: pending.currentOrigins ?? [], step: pending.step ?? 'select', action: pending.action ?? null, ...pending }); setProcessingId(null); return; }
      const existingCycle = await fetchUserCycleForEditalMerge(userId);
      const map = parseCycleUnificationMap(existingCycle?.unification_map ?? null);
      const existingIds = (existingCycle?.ciclo_atual as string[] | null) || [];
      const names = new Set(subjects.filter(subject => existingIds.includes(subject.id)).map(subject => subject.name.toLowerCase().trim()));
      const expandedIds = new Set(existingIds);
      map?.unifiedSubjects?.forEach(unified => { if (unified.originalSubjectIds.some(id => expandedIds.has(id))) { unified.originalSubjectIds.forEach(id => expandedIds.add(id)); if (unified.displayNameOverride) names.add(unified.displayNameOverride.toLowerCase().trim()); } });
      const realExistingIds = Array.from(expandedIds).filter(id => subjects.some(subject => subject.id === id));
      const editalSubjects = await fetchEditalSubjectsWithTopics(edital.subjectIds) as unknown as Subject[] | null;
      const progressSummary = buildEditalProgressSummary(editalSubjects || []);
      const origins: CycleOrigin[] = buildCycleOriginSources({ editais, selectedEditalId: edital.id, cycleSubjectIds: realExistingIds });
      const coveredIds = new Set(origins.flatMap(origin => isManualCycleOrigin(origin) ? [] : origin.subjectIds));
      if (realExistingIds.some(id => !coveredIds.has(id)) || (origins.length === 0 && (editalSubjects || []).some(subject => names.has(subject.name.toLowerCase().trim())))) origins.push({ name: 'Manual', isManual: true });
      if (editalSubjects) setLoadedEditalSubjects(editalSubjects);
      setCycleConflict({ isOpen: true, edital, existingIds: realExistingIds, currentOrigins: origins, step: 'select', action: realExistingIds.length > 0 ? null : 'replace', showDetailedPreview: realExistingIds.length === 0, progressSummary: progressSummary.hasProgress ? progressSummary : undefined, progressMode: progressSummary.hasProgress ? undefined : 'keep' });
    } catch (error) { await errorService.report(error, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao preparar carga do ciclo.' }); }
    finally { setProcessingId(null); }
  }, [canRunCycleStructuralOperation, editais, pendingMerges, setCycleConflict, setIsRecoveringMerge, setLoadedEditalSubjects, setProcessingId, subjects, userId]);

  const handleDiscardRecoveredMerge = useCallback(async (edital: UserEdital | null) => {
    if (!edital) return;
    await discardPendingMerge(edital.id); setIsRecoveringMerge(false); await handleLoadCycle(edital, { ignorePendingMerge: true });
  }, [discardPendingMerge, handleLoadCycle, setIsRecoveringMerge]);
  return { handleDiscardRecoveredMerge, handleLoadCycle };
};
