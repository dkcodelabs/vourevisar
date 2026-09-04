import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';

import type { ActiveTimer } from '@/contexts/TimerContext';
import { fetchActiveTopicContext } from '@/services/activeTopicContextService';
import { focusCycleSubject } from '@/utils/focusCycleSubject';
import { guardActiveTimerOperation } from '@/utils/activeTimerOperationGuard';

type UseSubjectsTimerGuardsInput = {
  activeTimer: Pick<ActiveTimer, 'topicId' | 'status'> | null;
  activeTimerFocusedSubjectId: string | null;
  activeTimerTopicName: string | null;
  executeMarcarMateriaComoEstudada: (subjectId: string) => Promise<unknown>;
  markMateriaComoEstudada: (subjectId: string) => void;
  handleDeletePermanent: (subjectId: string, editalIdToRemove?: string) => Promise<unknown>;
  handleDragEnd: (event: DragEndEvent) => Promise<unknown>;
  handleResetCycle: () => Promise<unknown>;
  handleStartNextCycle: () => Promise<unknown>;
  handleToggleCycleReorder: () => void;
  handleUnloadConfirm: () => Promise<unknown>;
  handleVoltarMateriaParaFila: (subjectId: string) => void;
  navigate: (to: string, options?: { state?: Record<string, string> }) => void;
  setActiveTab: (tab: 'all' | 'vertical') => void;
  setCycleExpandedSubjectIds: Dispatch<SetStateAction<string[]>>;
  setHighlightedSubjectId: Dispatch<SetStateAction<string | null>>;
  setPendingCompleteSubjectId: Dispatch<SetStateAction<string | null>>;
  setResetCycleConfirmOpen: Dispatch<SetStateAction<boolean>>;
  applySuggestedQueueOrder: (suggestedOrder: string[]) => Promise<void>;
};

export function useSubjectsTimerGuards({
  activeTimer,
  activeTimerFocusedSubjectId,
  activeTimerTopicName,
  executeMarcarMateriaComoEstudada,
  markMateriaComoEstudada,
  handleDeletePermanent,
  handleDragEnd,
  handleResetCycle,
  handleStartNextCycle,
  handleToggleCycleReorder,
  handleUnloadConfirm,
  handleVoltarMateriaParaFila,
  navigate,
  setActiveTab,
  setCycleExpandedSubjectIds,
  setHighlightedSubjectId,
  setPendingCompleteSubjectId,
  setResetCycleConfirmOpen,
  applySuggestedQueueOrder,
}: UseSubjectsTimerGuardsInput) {
  const focusActiveTimerTopic = useCallback(() => {
    if (!activeTimer?.topicId) return;

    void (async () => {
      try {
        const topicContext = await fetchActiveTopicContext(activeTimer.topicId);
        if (topicContext.destination === 'reviews') {
          navigate(`/revisoes?topicId=${activeTimer.topicId}`, { state: { focusTopicId: activeTimer.topicId } });
          return;
        }
      } catch {
        navigate(`/revisoes?topicId=${activeTimer.topicId}`, { state: { focusTopicId: activeTimer.topicId } });
        return;
      }

      if (!activeTimerFocusedSubjectId) return;
      focusCycleSubject({
        focusSubjectId: activeTimerFocusedSubjectId,
        focusTopicId: activeTimer.topicId,
        setActiveTab,
        setCycleExpandedSubjectIds,
        setHighlightedSubjectId,
      });
    })();
  }, [activeTimer?.topicId, activeTimerFocusedSubjectId, navigate, setActiveTab, setCycleExpandedSubjectIds, setHighlightedSubjectId]);

  const canRunCycleStructuralOperation = useCallback(() => {
    const message = activeTimerTopicName
      ? `Finalize, retome ou descarte a sessão em "${activeTimerTopicName}" antes de alterar o ciclo.`
      : undefined;
    const canRun = guardActiveTimerOperation(activeTimer, message);
    if (!canRun) focusActiveTimerTopic();
    return canRun;
  }, [activeTimer, activeTimerTopicName, focusActiveTimerTopic]);

  const handleMarkSubjectStudiedWithTimerGuard = useCallback((subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    markMateriaComoEstudada(subjectId);
  }, [canRunCycleStructuralOperation, markMateriaComoEstudada]);
  const executeMarkSubjectStudiedWithTimerGuard = useCallback(async (subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    await executeMarcarMateriaComoEstudada(subjectId);
    setPendingCompleteSubjectId(null);
  }, [canRunCycleStructuralOperation, executeMarcarMateriaComoEstudada, setPendingCompleteSubjectId]);
  const handleReturnSubjectToQueueWithTimerGuard = useCallback((subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    handleVoltarMateriaParaFila(subjectId);
  }, [canRunCycleStructuralOperation, handleVoltarMateriaParaFila]);
  const handleStartNextCycleWithTimerGuard = useCallback(() => {
    if (!canRunCycleStructuralOperation()) return;
    void handleStartNextCycle();
  }, [canRunCycleStructuralOperation, handleStartNextCycle]);
  const handleOpenResetCycleConfirmWithTimerGuard = useCallback((open: boolean) => {
    if (open && !canRunCycleStructuralOperation()) return;
    setResetCycleConfirmOpen(open);
  }, [canRunCycleStructuralOperation, setResetCycleConfirmOpen]);
  const handleResetCycleWithTimerGuard = useCallback(async () => {
    if (!canRunCycleStructuralOperation()) return;
    await handleResetCycle();
  }, [canRunCycleStructuralOperation, handleResetCycle]);
  const handleUnloadConfirmWithTimerGuard = useCallback(async () => {
    if (!canRunCycleStructuralOperation()) return;
    await handleUnloadConfirm();
  }, [canRunCycleStructuralOperation, handleUnloadConfirm]);
  const handleDeletePermanentWithTimerGuard = useCallback(async (subjectId: string, editalIdToRemove?: string) => {
    if (!canRunCycleStructuralOperation()) return;
    await handleDeletePermanent(subjectId, editalIdToRemove);
  }, [canRunCycleStructuralOperation, handleDeletePermanent]);
  const handleToggleCycleReorderWithTimerGuard = useCallback(() => {
    if (!canRunCycleStructuralOperation()) return;
    handleToggleCycleReorder();
  }, [canRunCycleStructuralOperation, handleToggleCycleReorder]);
  const handleDragEndWithTimerGuard = useCallback((event: DragEndEvent) => {
    if (!canRunCycleStructuralOperation()) return;
    void handleDragEnd(event);
  }, [canRunCycleStructuralOperation, handleDragEnd]);
  const handleApplySuggestedQueueOrderWithTimerGuard = useCallback((suggestedOrder: string[]) => {
    if (!canRunCycleStructuralOperation()) return;
    void applySuggestedQueueOrder(suggestedOrder);
  }, [applySuggestedQueueOrder, canRunCycleStructuralOperation]);

  return {
    executeMarkSubjectStudiedWithTimerGuard,
    handleApplySuggestedQueueOrderWithTimerGuard,
    handleDeletePermanentWithTimerGuard,
    handleDragEndWithTimerGuard,
    handleMarkSubjectStudiedWithTimerGuard,
    handleOpenResetCycleConfirmWithTimerGuard,
    handleResetCycleWithTimerGuard,
    handleReturnSubjectToQueueWithTimerGuard,
    handleStartNextCycleWithTimerGuard,
    handleToggleCycleReorderWithTimerGuard,
    handleUnloadConfirmWithTimerGuard,
  };
}
