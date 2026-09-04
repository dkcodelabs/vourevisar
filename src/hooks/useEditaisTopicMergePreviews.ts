import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subject } from '@/types';
import { toastGate } from '@/lib/errors/toastGate';
import { performFullTopicMerge, performHybridMerge } from '@/services/cycleMergeService';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { CycleConflictState, PendingMergeDraft, UserEdital } from '@/utils/editaisPagePresentation';

type Progress = { message: string; percentage?: number; current?: number; total?: number } | null;
export const useEditaisTopicMergePreviews = ({ cycleConflict, editais, loadPendingSuggestions, savePendingMerge, setCycleConflict, setIsAnalyzingTopics, setIsMerging, setMergePhase, setProcessingProgress, subjects, userId }: {
  cycleConflict: CycleConflictState; editais: UserEdital[]; loadPendingSuggestions: () => Promise<unknown>; savePendingMerge: (id: string, draft: PendingMergeDraft) => void; setCycleConflict: Dispatch<SetStateAction<CycleConflictState>>; setIsAnalyzingTopics: Dispatch<SetStateAction<boolean>>; setIsMerging: Dispatch<SetStateAction<boolean>>; setMergePhase: Dispatch<SetStateAction<'exact' | 'ai' | 'finalizing'>>; setProcessingProgress: Dispatch<SetStateAction<Progress>>; subjects: Subject[]; userId?: string;
}) => {
  const handleHybridPreview = useCallback(async () => {
    if (!cycleConflict.edital || !userId) return;
    if (cycleConflict.hybridResult && cycleConflict.topicMergeResult && cycleConflict.unificationMap && cycleConflict.step === 'select') { setCycleConflict(prev => ({ ...prev, step: 'topic-preview' })); return; }
    setIsMerging(true); setIsAnalyzingTopics(true); setMergePhase('exact'); setProcessingProgress({ message: 'Analisando matérias e tópicos...', percentage: 0 });
    try {
      const edital = cycleConflict.edital;
      const existingSubs = subjects.filter(subject => cycleConflict.existingIds.includes(subject.id));
      const newSubs = subjects.filter(subject => edital.subjectIds.includes(subject.id));
      const existingEditalIds = editais.filter(item => item.mergedIntoCycle && item.id !== edital.id).map(item => item.id);
      const result = await performHybridMerge(existingSubs, newSubs, existingEditalIds, edital.id, [], setMergePhase, setProcessingProgress);
      setCycleConflict(prev => ({ ...prev, hybridResult: result, unificationMap: result.unificationMap, finalSubjectIds: result.finalSubjectIds, step: 'preview' }));
      await loadPendingSuggestions();
    } catch (error) { console.error(error); toastGate.notifyError('Erro ao gerar prévia da mesclagem via IA.', 'IA-MERGE-PREVIEW', { severity: 'medium' }); }
    finally { setIsMerging(false); setIsAnalyzingTopics(false); setProcessingProgress(null); }
  }, [cycleConflict, editais, loadPendingSuggestions, setCycleConflict, setIsAnalyzingTopics, setIsMerging, setMergePhase, setProcessingProgress, subjects, userId]);

  const handleTopicPreview = useCallback(async (useAI: boolean) => {
    if (!cycleConflict.unificationMap) return;
    if (cycleConflict.topicMergeResult && cycleConflict.step === 'preview') { setCycleConflict(prev => ({ ...prev, step: 'topic-preview' })); return; }
    setIsAnalyzingTopics(true); setMergePhase('exact'); setProcessingProgress({ message: useAI ? 'Mesclando tópicos equivalentes...' : 'Organizando tópicos...', percentage: 0 });
    try {
      const overrides = cycleConflict.subjectDisplayNameOverrides || {};
      const map: CycleUnificationMap = { ...cycleConflict.unificationMap, unifiedSubjects: cycleConflict.unificationMap.unifiedSubjects.map(subject => ({ ...subject, displayNameOverride: overrides[subject.originalSubjectIds[0]] || subject.displayNameOverride })) };
      const result = await performFullTopicMerge(map, subjects, useAI, userId, undefined, setProcessingProgress, setMergePhase);
      const nextState = { step: 'topic-preview' as const, unificationMap: map, topicMergeResult: result };
      setCycleConflict(prev => ({ ...prev, ...nextState }));
      if (cycleConflict.edital) savePendingMerge(cycleConflict.edital.id, { existingIds: cycleConflict.existingIds, currentOrigins: cycleConflict.currentOrigins, action: cycleConflict.action, hybridResult: cycleConflict.hybridResult, aiStatus: cycleConflict.aiStatus, ...nextState });
      if (result.overallAiStatus === 'error') toastGate.notifyError(result.aiWarning || 'A IA não conseguiu analisar todos os tópicos. Usamos apenas mesclagem segura por nomes idênticos.', 'IA-TOPIC-MERGE-02', { severity: 'medium' });
      await loadPendingSuggestions();
    } catch (error) { console.error(error); toastGate.notifyError('Erro ao analisar tópicos.', 'IA-TOPIC-PREVIEW', { severity: 'medium' }); }
    finally { setIsAnalyzingTopics(false); setProcessingProgress(null); }
  }, [cycleConflict, loadPendingSuggestions, savePendingMerge, setCycleConflict, setIsAnalyzingTopics, setMergePhase, setProcessingProgress, subjects, userId]);

  const handleManualTopicEquivalenceChange = useCallback((map: CycleUnificationMap) => {
    if (!cycleConflict.edital) return;
    const nextState = { unificationMap: map, topicMergeResult: undefined };
    setCycleConflict(prev => ({ ...prev, ...nextState }));
    savePendingMerge(cycleConflict.edital.id, { existingIds: cycleConflict.existingIds, currentOrigins: cycleConflict.currentOrigins, action: cycleConflict.action, hybridResult: cycleConflict.hybridResult, aiStatus: cycleConflict.aiStatus, finalSubjectIds: cycleConflict.finalSubjectIds, subjectDisplayNameOverrides: cycleConflict.subjectDisplayNameOverrides, step: cycleConflict.step, ...nextState });
  }, [cycleConflict, savePendingMerge, setCycleConflict]);
  return { handleHybridPreview, handleManualTopicEquivalenceChange, handleTopicPreview };
};
