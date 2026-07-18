import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getUnifiedSubjectId } from '@/services/cycleMergeService';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import { CycleInactiveState } from '@/components/study-cycle/CycleInactiveState';
import { renderCycleTooltip } from '@/components/study-cycle/CycleTooltip';
import { StudyCycleLoadError } from '@/components/study-cycle/StudyCycleLoadError';
import { StudyCycleWorkspace } from '@/components/study-cycle/StudyCycleWorkspace';
import { SubjectsModalLayer } from '@/components/study-cycle/SubjectsModalLayer';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { useStudyCycleStrategicData } from '@/hooks/useStudyCycleStrategicData';

import { useMergeData } from '@/hooks/useMergeData';
import { useCycleQueueOrderActions } from '@/hooks/useCycleQueueOrderActions';
import { useCycleSubjectCompletionActions } from '@/hooks/useCycleSubjectCompletionActions';
import { useCycleEditalUnload } from '@/hooks/useCycleEditalUnload';
import { useCycleExamDateEditor } from '@/hooks/useCycleExamDateEditor';
import { usePermanentSubjectDeletion } from '@/hooks/usePermanentSubjectDeletion';
import { useEditalImport } from '@/hooks/useEditalImport';
import { useStudyCyclePageData } from '@/hooks/useStudyCyclePageData';
import { useStudyCycleReset } from '@/hooks/useStudyCycleReset';
import { useSubjectsDifficultyHandlers } from '@/hooks/useSubjectsDifficultyHandlers';
import { useSubjectsEditalModalState } from '@/hooks/useSubjectsEditalModalState';
import { useSubjectsNavigationState } from '@/hooks/useSubjectsNavigationState';
import { useSubjectsCycleRuntime } from '@/hooks/useSubjectsCycleRuntime';
import { useCycleQueueDisplayState } from '@/hooks/useCycleQueueDisplayState';
import { useCycleReorderControls } from '@/hooks/useCycleReorderControls';
import { useCycleSubjectListState } from '@/hooks/useCycleSubjectListState';
import { useCycleTopicNotesState } from '@/hooks/useCycleTopicNotesState';
import { useSubjectMergeReversion } from '@/hooks/useSubjectMergeReversion';
import { useSubjectWeightEditor } from '@/hooks/useSubjectWeightEditor';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useTopicStudySessionFlow } from '@/hooks/useTopicStudySessionFlow';
import { useCycleExpansionState } from '@/hooks/useCycleExpansionState';
import { useCycleSearch } from '@/hooks/useCycleSearch';
import { useCycleUnloadConfirmation } from '@/hooks/useCycleUnloadConfirmation';
import { useCycleVerticalViewData } from '@/hooks/useCycleVerticalViewData';
import { useCycleViewMode } from '@/hooks/useCycleViewMode';
import { useCycleStrategicAlertActions } from '@/hooks/useCycleStrategicAlertActions';
import { useCycleTopicFocus } from '@/hooks/useCycleTopicFocus';
import { useStrategicDockVisibility } from '@/hooks/useStrategicDockVisibility';
import {
  formatStudyMinutes,
  getCycleTopicStatusVisual,
  getStrategicTopicIncidenceDisplay,
  getStrategicTopicIncidenceTitle,
  getTopicContactCount,
  isTopicCompleted,
  isTopicNewlyStartedInCycle,
  isTopicStarted,
} from '@/utils/cycleTopicPresentation';
import { getStartedTopicCycleCta } from '@/utils/studyCycleSubjectState';
import {
  isVisibleCycleTopic,
} from '@/utils/studyCycleTopicVisibility';
import { guardActiveTimerOperation } from '@/utils/activeTimerOperationGuard';
import { focusCycleSubject } from '@/utils/focusCycleSubject';
import { fetchActiveTopicContext } from '@/services/activeTopicContextService';
import { updateActiveCycleName } from '@/services/cycleNameService';
import { mergeService } from '@/services/mergeService';
import { getCycleEntryState } from '@/utils/cycleEntryState';

type SubjectTab = 'all' | 'vertical';

const Subjects = () => {
  const { user } = useAuth();
  const { resetTimer, resumeTimer, setProcessedUpdate, stopTimer } = useTimer();
  const {
    originsMap,
    subjectIndividualOriginsMap,
    editaisData,
    editaisNoCiclo,
    activeSubjectIdsSet,
    refresh,
    isLoading: isOriginsLoading,
  } = useEditalOriginsWithMerge();
  const {
    getUnifiedSubjectName,
    isSubjectMerged,
    revertSubjectMerge,
    getSubjectMergeInfo,
    dynamicUnificationMap,
    refresh: refreshMergeData,
  } = useMergeData();
  const navigate = useNavigate();
  const {
    dataLoaded,
    isLoading,
    loadError,
    loading,
    localSubjects,
    refreshData,
    retryInitialLoad,
    setIsLoading,
    setLocalSubjects,
    setSubjects,
    setUserCycle,
    subjects,
    userCycle,
  } = useStudyCyclePageData({ refreshOrigins: refresh, user });
  const location = useLocation();
  const subjectsLocationState = location.state as {
    openImportModal?: boolean;
    importTab?: 'ready' | 'ia' | 'manual';
    focusSubjectId?: string;
    focusTopicId?: string;
  } | null;
  const {
    closeImportEditalModal,
    inputRef,
    isImportEditalModalOpen,
    modalInitialTab,
    openCycleSearch,
    setIsCycleSearchOpen,
    setIsImportEditalModalOpen,
  } = useSubjectsNavigationState({
    locationState: subjectsLocationState,
  });
  const {
    setUnloadConfirm,
    unloadConfirm,
    unloadEdital: handleUnloadCycle,
    unloadingEditalId,
  } = useCycleEditalUnload({ refreshData, userId: user?.id });
  const {
    handleUnloadConfirm,
    handleUnloadConfirmOpenChange,
  } = useCycleUnloadConfirmation({
    handleUnloadCycle,
    setUnloadConfirm,
    unloadConfirm,
  });
  const {
    deletePermanent: handleDeletePermanent,
    deletePermanentConfirm,
    setDeletePermanentConfirm,
  } = usePermanentSubjectDeletion({
    refreshOrigins: refresh,
    setIsLoading,
    setLocalSubjects,
    userId: user?.id,
  });
  const {
    isResettingCycle,
    resetCycle: handleResetCycle,
    resetCycleConfirmOpen,
    setResetCycleConfirmOpen,
    startNextCycle,
  } = useStudyCycleReset({
    setUserCycle,
    userCycle,
    userId: user?.id,
  });
  const {
    editorOpen: cycleExamDateEditorOpen,
    errorMessage: cycleExamDateError,
    examDateDraft: cycleExamDateDraft,
    handleEditorOpenChange: handleCycleExamDateEditorOpenChange,
    isSaving: isSavingCycleExamDate,
    openEditor: openCycleExamDateEditor,
    saveExamDate: saveCycleExamDate,
    setExamDateDraft: setCycleExamDateDraft,
  } = useCycleExamDateEditor({
    setUserCycle,
    userCycle,
    userId: user?.id,
  });
  const { importSubjects: handleImportSubjects } = useEditalImport({
    closeModal: closeImportEditalModal,
    refreshData,
    refreshOrigins: refresh,
    setIsLoading,
    userId: user?.id,
  });
  const {
    handleCloseRevertModal,
    handleOpenRevertSubjectMerge,
    handleRevertMergeConfirm,
    isRevertModalOpen,
    isReverting,
    selectedMergeName,
    selectedMergeOriginals,
  } = useSubjectMergeReversion({
    originsMap: subjectIndividualOriginsMap,
    revertSubjectMerge,
    subjects,
  });

  const { openReviewModal, difficultyModalData, closeDifficultyModal, markTopicAsReviewed, isLoading: isSavingTopicReview } = useTopicReview();
  const { activeTimer, handleTopicStudyAction } = useTopicStudySessionFlow({ openReviewModal });
  const handleSaveUnifiedSubjectName = useCallback(async (originalSubjectIds: string[], displayName: string) => {
    if (!user?.id) throw new Error('Sessão expirada. Entre novamente para salvar.');
    const merge = originalSubjectIds
      .map(subjectId => getSubjectMergeInfo(subjectId))
      .find(Boolean);
    if (!merge) throw new Error('Não encontrei a mesclagem desta matéria para salvar o nome.');

    await mergeService.updateSubjectMergeDisplayName(merge.id, user.id, displayName);
    await refreshMergeData();
    await refreshData();
  }, [getSubjectMergeInfo, refreshData, refreshMergeData, user?.id]);
  const {
    editaisNoCicloModalData,
    handleCloseSubjectsModal,
    handleCloseSubjectOriginChooser,
    handleManageCycleSubject,
    handleSaveSubjectOriginName,
    handleSelectSubjectOrigin,
    handleSubjectOriginNameDraftChange,
    handleSubjectsModalUpdate,
    subjectOriginChooser,
    subjectsModal,
  } = useSubjectsEditalModalState({
    dynamicUnificationMap,
    editaisData,
    editaisNoCiclo,
    onSaveUnifiedSubjectName: handleSaveUnifiedSubjectName,
    refresh,
    refreshData,
    subjects,
  });

  const [cycleSearchQuery, setCycleSearchQuery] = useState('');
  const {
    clearSavedWeight,
    editingWeightSubjectId,
    handleCancelWeightEdit,
    handleSaveSubjectWeightInline,
    handleStartWeightEdit,
    isSavingWeight,
    setWeightDraft,
    weightDraft,
    weightSavedSubjectId,
  } = useSubjectWeightEditor({
    setLocalSubjects,
    setSubjects,
    userId: user?.id,
  });
  const [completeCycleConfirmOpen, setCompleteCycleConfirmOpen] = useState(false);
  const [pendingCompleteSubjectId, setPendingCompleteSubjectId] = useState<string | null>(null);

  // View mode: ciclo padrão ou visualização verticalizada do edital
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');

  const {
    completedEditalSubjectIdSet,
    cycleClosedSubjectIdSet,
    expandedSubjectList,
    fullyStartedSubjectIdSet,
    getEquivalentSubjectIds,
    studiedCycleIdSet,
    visibleCycleTopicIds,
  } = useCycleSubjectListState({
    activeSubjectIdsSet,
    dynamicUnificationMap,
    isTopicCompleted,
    isTopicStarted,
    localSubjects,
    userCycle,
  });
  const activeTimerFocusedSubjectId = useMemo(() => {
    if (!activeTimer?.topicId) return null;

    return expandedSubjectList.find(item =>
      item.subject.topics.some(topic => topic.id === activeTimer.topicId)
    )?.subject.id || null;
  }, [activeTimer?.topicId, expandedSubjectList]);
  const navigationFocusedSubjectId = useMemo(() => {
    if (!subjectsLocationState?.focusTopicId) return subjectsLocationState?.focusSubjectId || null;

    return expandedSubjectList.find(item =>
      item.subject.topics.some(topic => topic.id === subjectsLocationState.focusTopicId)
    )?.subject.id || subjectsLocationState.focusSubjectId || null;
  }, [expandedSubjectList, subjectsLocationState?.focusSubjectId, subjectsLocationState?.focusTopicId]);
  const preserveExpandedSubjectIdSet = useMemo(() => {
    const ids = new Set<string>();
    if (navigationFocusedSubjectId) ids.add(navigationFocusedSubjectId);
    if (activeTimerFocusedSubjectId) ids.add(activeTimerFocusedSubjectId);
    return ids;
  }, [activeTimerFocusedSubjectId, navigationFocusedSubjectId]);

  const {
    cycleExpandedSubjectIds,
    expandedSubjectIds,
    highlightedSubjectId,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
    setVerticalExpandedSubjectIds,
  } = useCycleExpansionState({
    activeTab,
    cycleClosedSubjectIdSet,
    dataLoaded,
    expandedSubjectList,
    preserveExpandedSubjectIdSet,
    userId: user?.id,
  });
  const {
    handleDragStart,
    handleToggleCycleReorder,
    isReorderingCycle,
    sensors,
    setIsReorderingCycle,
  } = useCycleReorderControls({
    setCycleExpandedSubjectIds,
  });

  useCycleTopicFocus({
    expandedSubjectList,
    locationState: subjectsLocationState,
    subjects,
    setActiveTab,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
  });

  // Sincronização redundante de localSubjects removida para evitar flicker.
  // localSubjects agora é gerenciado diretamente no loadSubjects.

  const {
    cycleSnapshots,
    cycleStudyEvents,
    recordCycleEvent,
    recordConfirmedTopicCycleEvent,
    topicStats,
    topicStudyMinutes,
  } = useSubjectsCycleRuntime({
    difficultyModalData,
    dynamicUnificationMap,
    localSubjects,
    subjects,
    user,
    userCycle,
    visibleCycleTopicIds,
  });

  const handleCycleTopicStudyAction = useCallback(async (topicId: string) => {
    try {
      await handleTopicStudyAction(topicId);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleCycleTopicStudyAction',
          userMessage: 'Erro ao abrir sessão de estudo do tópico.',
          severity: 'medium',
          scope: 'core',
          userId: user?.id,
        },
      );
    }
  }, [handleTopicStudyAction, user?.id]);

  const {
    executeMarcarMateriaComoEstudada,
    handleMarcarMateriaComoEstudada,
    handleVoltarMateriaParaFila,
  } = useCycleSubjectCompletionActions({
    cycleClosedSubjectIdSet,
    dynamicUnificationMap,
    expandedSubjectList,
    getEquivalentSubjectIds,
    getUnifiedSubjectName,
    localSubjects,
    recordCycleEvent,
    setCompleteCycleConfirmOpen,
    setCycleExpandedSubjectIds,
    setPendingCompleteSubjectId,
    setUserCycle,
    user,
    userCycle,
  });

  const {
    closeCycleSearch,
    filteredList,
    handleCycleSearchChange,
  } = useCycleSearch({
    activeTab,
    cycleClosedSubjectIdSet,
    cycleExpandedSubjectIds,
    expandedSubjectList,
    isImportEditalModalOpen,
    query: cycleSearchQuery,
    setCycleExpandedSubjectIds,
    setIsCycleSearchOpen,
    setQuery: setCycleSearchQuery,
  });

  const {
    cycleDisplayName,
    displayList,
    handleLoadMore,
    hasActiveCycle,
    hasMore,
    isCycleFullyStudied,
    orderedCycleDisplayList,
    showCycleWorkspace,
    totalDisplayItems,
    visibleCount,
  } = useCycleQueueDisplayState({
    cycleClosedSubjectIdSet,
    expandedSubjectList,
    filteredList,
    userCycle,
  });

  const cycleEntryState = useMemo(() => getCycleEntryState({
    access: { status: 'active' },
    content: {
      editalCount: editaisData.length,
      editaisWithContentCount: editaisData.filter(edital => edital.subject_ids.length > 0).length,
      cycleSubjectsCount: expandedSubjectList.length,
      hasActiveCycle: hasActiveCycle,
      isLoading: isLoading || loading || isOriginsLoading,
      hasLoadError: Boolean(loadError),
      searchQuery: cycleSearchQuery,
      filteredItemCount: displayList.length,
    },
  }), [cycleSearchQuery, displayList.length, editaisData, expandedSubjectList.length, hasActiveCycle, isLoading, isOriginsLoading, loadError, loading]);

  const handleRenameCycle = useCallback(async (name: string) => {
    if (!user?.id || !userCycle) throw new Error('Ciclo ativo não encontrado');

    try {
      const updatedCycle = await updateActiveCycleName({ name, userId: user.id });
      const nextCycle = { ...userCycle, name: updatedCycle.name };
      setUserCycle(nextCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextCycle));
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { source: 'Subjects', action: 'updateCycleName' },
      }));
      toast.success('Nome do ciclo atualizado.');
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects',
        action: 'updateCycleName',
        userMessage: 'Não foi possível atualizar o nome do ciclo.',
        severity: 'medium',
        scope: 'core',
        userId: user.id,
      });
      throw error;
    }
  }, [setUserCycle, user?.id, userCycle]);

  const {
    handleApplySuggestedQueueOrder,
    handleDragEnd,
  } = useCycleQueueOrderActions({
    activeTab,
    expandedSubjectList,
    orderedCycleDisplayList,
    recordCycleEvent,
    setIsReorderingCycle,
    setUserCycle,
    user,
    userCycle,
  });
  const activeTimerTopicName = useMemo(() => {
    if (!activeTimer?.topicId) return null;

    for (const item of expandedSubjectList) {
      const topic = item.subject.topics.find(subjectTopic => subjectTopic.id === activeTimer.topicId);
      if (topic?.name) return topic.name;
    }

    return null;
  }, [activeTimer?.topicId, expandedSubjectList]);
  const focusActiveTimerTopic = useCallback(() => {
    if (!activeTimer?.topicId) return;

    void (async () => {
      try {
        const topicContext = await fetchActiveTopicContext(activeTimer.topicId);
        if (topicContext.destination === 'reviews') {
          navigate(`/revisoes?topicId=${activeTimer.topicId}`, {
            state: { focusTopicId: activeTimer.topicId },
          });
          return;
        }
      } catch {
        navigate(`/revisoes?topicId=${activeTimer.topicId}`, {
          state: { focusTopicId: activeTimer.topicId },
        });
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
  }, [
    activeTimer?.topicId,
    activeTimerFocusedSubjectId,
    navigate,
    setActiveTab,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
  ]);
  const canRunCycleStructuralOperation = useCallback(
    () => {
      const message = activeTimerTopicName
        ? `Finalize, retome ou descarte a sessão em "${activeTimerTopicName}" antes de alterar o ciclo.`
        : undefined;
      const canRun = guardActiveTimerOperation(activeTimer, message);
      if (!canRun) focusActiveTimerTopic();
      return canRun;
    },
    [activeTimer, activeTimerTopicName, focusActiveTimerTopic],
  );
  const handleMarkSubjectStudiedWithTimerGuard = useCallback((subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    handleMarcarMateriaComoEstudada(subjectId);
  }, [canRunCycleStructuralOperation, handleMarcarMateriaComoEstudada]);
  const executeMarkSubjectStudiedWithTimerGuard = useCallback(async (subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    await executeMarcarMateriaComoEstudada(subjectId);
    setPendingCompleteSubjectId(null);
  }, [canRunCycleStructuralOperation, executeMarcarMateriaComoEstudada]);
  const handleReturnSubjectToQueueWithTimerGuard = useCallback((subjectId: string) => {
    if (!canRunCycleStructuralOperation()) return;
    handleVoltarMateriaParaFila(subjectId);
  }, [canRunCycleStructuralOperation, handleVoltarMateriaParaFila]);
  const handleStartNextCycleWithTimerGuard = useCallback(() => {
    if (!canRunCycleStructuralOperation()) return;
    void startNextCycle();
  }, [canRunCycleStructuralOperation, startNextCycle]);
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
  const handleDragEndWithTimerGuard = useCallback((event: Parameters<typeof handleDragEnd>[0]) => {
    if (!canRunCycleStructuralOperation()) return;
    void handleDragEnd(event);
  }, [canRunCycleStructuralOperation, handleDragEnd]);
  const handleApplySuggestedQueueOrderWithTimerGuard = useCallback((suggestedOrder: string[]) => {
    if (!canRunCycleStructuralOperation()) return;
    void handleApplySuggestedQueueOrder(suggestedOrder);
  }, [canRunCycleStructuralOperation, handleApplySuggestedQueueOrder]);

  const {
    getSubjectTopicSummaryLabel,
    verticalSubjectList,
    verticalSummaryEdital,
  } = useCycleVerticalViewData({
    completedEditalSubjectIdSet,
    dynamicUnificationMap,
    editaisNoCiclo,
    filteredList,
    fullyStartedSubjectIdSet,
    getUnifiedSubjectId,
    isImportEditalModalOpen,
    isTopicCompleted,
    isTopicStarted,
    isVisibleCycleTopic,
    query: cycleSearchQuery,
    studiedCycleIdSet,
    userCycleStartDate: userCycle?.data_inicio_ciclo,
  });
  const {
    closeTopicNotes,
    openQueueTopicNotes,
    openVerticalTopicNotes,
    selectedTopicForNotes,
  } = useCycleTopicNotesState({
    verticalSubjectList,
  });

  useEffect(() => {
    if (activeTab !== 'vertical') return;
    setVerticalExpandedSubjectIds(verticalSubjectList.map(item => item.id));
  }, [activeTab, setVerticalExpandedSubjectIds, verticalSubjectList]);

  const {
    handleViewModeToggle,
    toggleAllCycleSubjects,
    toggleExpand,
  } = useCycleViewMode({
    activeTab,
    expandedSubjectIds,
    filteredSubjectIds: filteredList.map(item => item.id),
    setActiveTab,
    setCycleExpandedSubjectIds,
    setVerticalExpandedSubjectIds,
    verticalSubjectIds: verticalSubjectList.map(item => item.id),
  });

  const {
    cycleEventInsights,
    cycleMaturity,
    cycleMetrics,
    cycleTransitionSummary,
    cycleVisualStats,
    queueSuggestion,
    strategicAlerts,
    strategicPanelStats,
  } = useStudyCycleStrategicData({
    cycleClosedSubjectIdSet,
    cycleSnapshots,
    cycleStudyEvents,
    dynamicUnificationMap,
    editaisNoCiclo,
    expandedSubjectList,
    getUnifiedSubjectName,
    topicStudyMinutes,
    userCycle,
  });
  const {
    isStrategicDockVisible,
    strategicDockLayout,
    strategicDockRef,
    strategicPanelRef,
    strategicPanelTitleRef,
  } = useStrategicDockVisibility({
    activeTab,
    isLoading,
    isOriginsLoading,
    loading,
    queueSuggestion,
    showCycleWorkspace,
    strategicAlertsLength: strategicAlerts.length,
  });

  const focusSubjectFromStrategicAction = useCallback((subjectId: string) => {
    focusCycleSubject({
      focusSubjectId: subjectId,
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    });
  }, [setCycleExpandedSubjectIds, setHighlightedSubjectId]);

  const { handleStrategicAlertAction } = useCycleStrategicAlertActions({
    expandedSubjectList,
    focusSubject: focusSubjectFromStrategicAction,
    handleCycleTopicStudyAction,
    handleStartWeightEdit,
    navigate,
    openCycleExamDateEditor,
  });

  const {
    handleDifficultyConfirmReview,
    handleDifficultyDiscard,
    handleDifficultyResume,
    handleDifficultySubmit,
  } = useSubjectsDifficultyHandlers({
    closeDifficultyModal,
    difficultyModalData,
    markTopicAsReviewed,
    recordConfirmedTopicCycleEvent,
    refreshData,
    resetTimer,
    resumeTimer,
    setProcessedUpdate,
    stopTimer,
    userId: user?.id,
  });

	  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  if (loadError) {
    return <StudyCycleLoadError loadError={loadError} onRetry={retryInitialLoad} />;
  }

  const mainSubjectUI = (
    <StudyCycleWorkspace
      activeTab={activeTab}
      cycleTransitionSummary={cycleTransitionSummary}
      cycleEntryState={cycleEntryState}
      dataLoaded={dataLoaded}
      displayListLength={displayList.length}
      dndContextProps={{
        onDragEnd: handleDragEndWithTimerGuard,
        onDragStart: handleDragStart,
        sensors,
      }}
      firstContactFormatStudyMinutes={formatStudyMinutes}
      hasActiveCycle={hasActiveCycle}
      hasMore={hasMore}
      isCycleFullyStudied={isCycleFullyStudied}
      isLoading={isLoading}
      localSubjectsCount={localSubjects.length}
      onGoToEditais={() => navigate('/meus-editais')}
      onLoadMore={handleLoadMore}
      onNavigate={navigate}
      onStartNextCycle={handleStartNextCycleWithTimerGuard}
      queueProps={{
        activeTab,
        activeTimer: activeTimer ? { topicId: activeTimer.topicId, status: activeTimer.status } : null,
        clearSavedWeight,
        completedEditalSubjectIdSet,
        displayList,
        editingWeightSubjectId,
        expandedSubjectIds,
        fullyStartedSubjectIdSet,
        getCycleTopicStatusVisual,
        getStartedTopicCta: getStartedTopicCycleCta,
        getStrategicTopicIncidenceDisplay,
        getStrategicTopicIncidenceTitle,
        getSubjectMergeInfo,
        getTopicContactCount: (topic) => getTopicContactCount(topic, topicStats),
        getUnifiedSubjectName,
        handleCancelWeightEdit,
        handleManageSubject: handleManageCycleSubject,
        handleMarkStudied: handleMarkSubjectStudiedWithTimerGuard,
        handleOpenNotes: openQueueTopicNotes,
        handleOpenRevertMerge: handleOpenRevertSubjectMerge,
        handleReturnToQueue: handleReturnSubjectToQueueWithTimerGuard,
        handleSaveSubjectWeightInline,
        handleStartWeightEdit,
        handleStudyAction: handleCycleTopicStudyAction,
        highlightedSubjectId,
        isReorderingCycle,
        isSavingWeight,
        isSubjectMerged,
        isTopicCompleted,
        isTopicNewlyStartedInCycle: (topic) => isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo),
        isTopicStarted,
        onGoToReview: (topicId) => navigate(`/revisoes?topicId=${topicId}`),
        renderCycleTooltip,
        setWeightDraft,
        studiedCycleIdSet,
        toggleExpand,
        weightDraft,
        weightSavedSubjectId,
      }}
      remainingItemsCount={totalDisplayItems - visibleCount}
      strategicPanelProps={{
        cycleDisplayName,
        cycleEventInsights,
        cycleMaturity,
        cycleTransitionSummary,
        cycleVisualStats,
        editaisNoCiclo,
        getUnifiedSubjectName,
        handleApplySuggestedQueueOrder: handleApplySuggestedQueueOrderWithTimerGuard,
        handleStrategicAlertAction,
        isResettingCycle,
        isStrategicDockVisible,
        localSubjects,
        queueSuggestion,
        renderCycleTooltip,
        setResetCycleConfirmOpen: handleOpenResetCycleConfirmWithTimerGuard,
        strategicAlerts,
        strategicDockLayout,
        strategicDockRef,
        strategicPanelRef,
        strategicPanelStats,
        strategicPanelTitleRef,
        userCycle,
      }}
      verticalWorkspaceProps={{
        activeTimer: activeTimer ? { topicId: activeTimer.topicId, status: activeTimer.status } : null,
        clearSavedWeight,
        cycleMetrics,
        cycleSearchQuery,
        editingWeightSubjectId,
        expandedSubjectIds,
        getCycleTopicStatusVisual,
        getStartedTopicCta: getStartedTopicCycleCta,
        getStrategicTopicIncidenceDisplay,
        getStrategicTopicIncidenceTitle,
        getSubjectTopicSummaryLabel,
        getTopicContactCount: (topic) => getTopicContactCount(topic, topicStats),
        getUnifiedSubjectName,
        handleCancelWeightEdit,
        handleSaveSubjectWeightInline,
        handleStartWeightEdit,
        isSavingWeight,
        isTopicCompleted,
        isTopicNewlyStartedInCycle: (topic) => isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo),
        isTopicStarted,
        onGoToReview: (topicId) => navigate(`/revisoes?topicId=${topicId}`),
        onOpenReviews: () => navigate('/revisoes'),
        onOpenTopicNotes: openVerticalTopicNotes,
        onStudyAction: handleCycleTopicStudyAction,
        setWeightDraft,
        subjects: verticalSubjectList,
        summaryEdital: verticalSummaryEdital,
        weightDraft,
        weightSavedSubjectId,
      }}
      workspaceHeaderProps={{
        activeTab,
        cycleDisplayName,
        cycleSearchQuery,
        expandedSubjectIds,
        filteredSubjectIds: filteredList.map((item) => item.id),
        inputRef,
        isReorderingCycle,
	        onActivateSearch: openCycleSearch,
	        onClearSearch: closeCycleSearch,
	        onRenameCycle: handleRenameCycle,
	        onSearchChange: handleCycleSearchChange,
        onToggleAll: toggleAllCycleSubjects,
        onToggleReorder: handleToggleCycleReorderWithTimerGuard,
        onToggleViewMode: handleViewModeToggle,
        verticalSubjectIds: verticalSubjectList.map((item) => item.id),
      }}
    />
  );

  return (
    <div className="flex w-full font-sans text-foreground">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-0 pb-8 pt-0 flex flex-col gap-6">
          <div className="flex-1 min-w-0 w-full">
            {!isImportEditalModalOpen && (
              showCycleWorkspace ? (
                mainSubjectUI
              ) : (
                <CycleInactiveState
                  hasActiveCycle={hasActiveCycle}
                  onGoToEditais={() => navigate('/meus-editais', { state: { filterCycle: hasActiveCycle } })}
                />
              )
            )}
          </div>
        </main>

        {/* Modals positioned within the layout */}
        <SubjectsModalLayer
          closeDifficultyModal={closeDifficultyModal}
          completeCycleConfirmOpen={completeCycleConfirmOpen}
          cycleExamDateDraft={cycleExamDateDraft}
          cycleExamDateEditorOpen={cycleExamDateEditorOpen}
          cycleExamDateError={cycleExamDateError}
          deletePermanentConfirm={deletePermanentConfirm}
          difficultyModalData={difficultyModalData}
          editaisNoCiclo={editaisNoCicloModalData}
          executeMarcarMateriaComoEstudada={executeMarkSubjectStudiedWithTimerGuard}
          handleDeletePermanent={handleDeletePermanentWithTimerGuard}
          handleDifficultyConfirmReview={handleDifficultyConfirmReview}
          handleDifficultyDiscard={handleDifficultyDiscard}
          handleDifficultyResume={handleDifficultyResume}
          handleDifficultySubmit={handleDifficultySubmit}
          handleResetCycle={handleResetCycleWithTimerGuard}
          isImportEditalModalOpen={isImportEditalModalOpen}
          isResettingCycle={isResettingCycle}
          isRevertModalOpen={isRevertModalOpen}
          isReverting={isReverting}
          isSavingCycleExamDate={isSavingCycleExamDate}
          isSavingTopicReview={isSavingTopicReview}
          mainSubjectUI={mainSubjectUI}
          modalInitialTab={modalInitialTab}
          onCloseImportEditalModal={() => setIsImportEditalModalOpen(false)}
          onCloseNotesModal={closeTopicNotes}
          onCloseRevertModal={handleCloseRevertModal}
          onCloseSubjectOriginChooser={handleCloseSubjectOriginChooser}
          onCloseSubjectsModal={handleCloseSubjectsModal}
          onCycleExamDateOpenChange={handleCycleExamDateEditorOpenChange}
          onDeletePermanentConfirmOpenChange={(open) => !open && setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, editais: [] })}
          onImportSubjects={handleImportSubjects}
          onResetCycleConfirmOpenChange={handleOpenResetCycleConfirmWithTimerGuard}
          onRevertMergeConfirm={handleRevertMergeConfirm}
          onSaveCycleExamDate={saveCycleExamDate}
          onSaveSubjectOriginName={handleSaveSubjectOriginName}
          onSetCycleExamDateDraft={setCycleExamDateDraft}
          onSetUnloadConfirmOpen={handleUnloadConfirmOpenChange}
          onSelectSubjectOrigin={handleSelectSubjectOrigin}
          onSubjectOriginNameDraftChange={handleSubjectOriginNameDraftChange}
          onSubjectsModalUpdate={handleSubjectsModalUpdate}
          onUnloadConfirm={handleUnloadConfirmWithTimerGuard}
          pendingCompleteSubjectId={pendingCompleteSubjectId}
          resetCycleConfirmOpen={resetCycleConfirmOpen}
          selectedMergeName={selectedMergeName}
          selectedMergeOriginals={selectedMergeOriginals}
          selectedTopicForNotes={selectedTopicForNotes}
          setCompleteCycleConfirmOpen={setCompleteCycleConfirmOpen}
          subjectOriginChooser={subjectOriginChooser}
          subjects={subjects}
          subjectsModal={subjectsModal}
          unloadConfirm={unloadConfirm}
          unloadingEditalId={unloadingEditalId}
        />
      </div>
    </div>
  );
};

export default Subjects;
