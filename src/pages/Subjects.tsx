import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageLoadingState } from '@/components/ui/PageLoadingState';
import { getUnifiedSubjectId } from '@/services/cycleMergeService';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import { renderCycleTooltip } from '@/components/study-cycle/CycleTooltip';
import { StudyCycleLoadError } from '@/components/study-cycle/StudyCycleLoadError';
import { StudyCycleWorkspace } from '@/components/study-cycle/StudyCycleWorkspace';
import { SubjectsPageView } from '@/components/study-cycle/SubjectsPageView';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
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
import { useSubjectMergeReversion } from '@/hooks/useSubjectMergeReversion';
import { useSubjectWeightEditor } from '@/hooks/useSubjectWeightEditor';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useTopicStudySessionFlow } from '@/hooks/useTopicStudySessionFlow';
import { useCycleExpansionState } from '@/hooks/useCycleExpansionState';
import { useCycleSearch } from '@/hooks/useCycleSearch';
import { useCycleUnloadConfirmation } from '@/hooks/useCycleUnloadConfirmation';
import { useCycleStrategicAlertActions } from '@/hooks/useCycleStrategicAlertActions';
import { useCycleTopicFocus } from '@/hooks/useCycleTopicFocus';
import { useSubjectsTimerGuards } from '@/hooks/useSubjectsTimerGuards';
import { useSubjectsCycleEntryState } from '@/hooks/useSubjectsCycleEntryState';
import { useSubjectsPresentationState } from '@/hooks/useSubjectsPresentationState';
import { useSubjectsFocusState } from '@/hooks/useSubjectsFocusState';
import { formatStudyMinutes, getCycleTopicStatusVisual, getTopicContactCount, isTopicCompleted, isTopicNewlyStartedInCycle, isTopicStarted } from '@/utils/cycleTopicPresentation';
import { getStartedTopicCycleCta } from '@/utils/studyCycleSubjectState';
import { isVisibleCycleTopic } from '@/utils/studyCycleTopicVisibility';
import { useSubjectsCycleName } from '@/hooks/useSubjectsCycleName';
import { useUnifiedSubjectNameSave } from '@/hooks/useUnifiedSubjectNameSave';
import { useSubjectsNavigationActions } from '@/hooks/useSubjectsNavigationActions';

type SubjectTab = 'all' | 'vertical';

const Subjects = () => {
  const { user } = useAuth();
  const { resetTimer, resumeTimer, setProcessedUpdate, stopTimer } = useTimer();
  const { originsMap, subjectIndividualOriginsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, refresh, isLoading: isOriginsLoading } = useEditalOriginsWithMerge();
  const { getUnifiedSubjectName, isSubjectMerged, revertSubjectMerge, getSubjectMergeInfo, dynamicUnificationMap, refresh: refreshMergeData } = useMergeData();
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
  const { closeImportEditalModal, inputRef, isImportEditalModalOpen, modalInitialTab, openCycleSearch, setIsCycleSearchOpen, setIsImportEditalModalOpen } = useSubjectsNavigationState({
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
  const { handleSaveUnifiedSubjectName } = useUnifiedSubjectNameSave({
    getSubjectMergeInfo,
    refreshData,
    refreshMergeData,
    userId: user?.id,
  });
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
  const { activeTimerFocusedSubjectId, preserveExpandedSubjectIdSet } = useSubjectsFocusState({
    activeTimerTopicId: activeTimer?.topicId,
    expandedSubjectList,
    locationState: subjectsLocationState,
  });

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

  const { focusSubjectFromStrategicAction, handleCycleTopicStudyAction, handleOpenImport } = useSubjectsNavigationActions({
    handleTopicStudyAction,
    setActiveTab,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
    userId: user?.id,
  });

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

  const { closeCycleSearch, filteredList, handleCycleSearchChange } = useCycleSearch({
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

  const { cycleDisplayName, displayList, handleLoadMore, hasActiveCycle, hasMore, isCycleFullyStudied, orderedCycleDisplayList, showCycleWorkspace, totalDisplayItems, visibleCount } = useCycleQueueDisplayState({
    cycleClosedSubjectIdSet,
    expandedSubjectList,
    filteredList,
    userCycle,
  });

  const cycleEntryState = useSubjectsCycleEntryState({
    cycleSearchQuery,
    cycleSubjectsCount: expandedSubjectList.length,
    editalCount: editaisData.length,
    editaisWithContentCount: editaisData.filter(edital => edital.subject_ids.length > 0).length,
    filteredItemCount: displayList.length,
    hasActiveCycle,
    isLoading,
    isOriginsLoading,
    loadError,
    loading,
  });

  const { handleRenameCycle } = useSubjectsCycleName({ setUserCycle, user, userCycle });

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
  const activeTimerTopicName = useMemo(() => expandedSubjectList
    .flatMap(item => item.subject.topics)
    .find(topic => topic.id === activeTimer?.topicId)?.name || null, [activeTimer?.topicId, expandedSubjectList]);
  const {
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
  } = useSubjectsTimerGuards({
    activeTimer,
    activeTimerFocusedSubjectId,
    activeTimerTopicName,
    applySuggestedQueueOrder: handleApplySuggestedQueueOrder,
    executeMarcarMateriaComoEstudada,
    handleDeletePermanent,
    handleDragEnd,
    handleResetCycle,
    handleStartNextCycle: startNextCycle,
    handleToggleCycleReorder,
    handleUnloadConfirm,
    handleVoltarMateriaParaFila,
    markMateriaComoEstudada: handleMarcarMateriaComoEstudada,
    navigate,
    setActiveTab,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
    setPendingCompleteSubjectId,
    setResetCycleConfirmOpen,
  });

  const {
    closeTopicNotes,
    cycleEventInsights,
    cycleMaturity,
    cycleMetrics,
    cycleTransitionSummary,
    cycleVisualStats,
    getSubjectTopicSummaryLabel,
    handleViewModeToggle,
    isStrategicDockVisible,
    openQueueTopicNotes,
    openVerticalTopicNotes,
    queueSuggestion,
    selectedTopicForNotes,
    strategicAlerts,
    strategicDockLayout,
    strategicDockRef,
    strategicPanelRef,
    strategicPanelStats,
    strategicPanelTitleRef,
    toggleAllCycleSubjects,
    toggleExpand,
    verticalSubjectList,
    verticalSummaryEdital,
  } = useSubjectsPresentationState({
    activeTab,
    dockVisibility: {
      activeTab,
      isLoading,
      isOriginsLoading,
      loading,
      showCycleWorkspace,
    },
    setVerticalExpandedSubjectIds,
    strategicData: {
      cycleClosedSubjectIdSet,
      cycleSnapshots,
      cycleStudyEvents,
      dynamicUnificationMap,
      editaisNoCiclo,
      expandedSubjectList,
      getUnifiedSubjectName,
      topicStudyMinutes,
      userCycle,
    },
    verticalView: {
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
    },
    viewMode: {
      activeTab,
      expandedSubjectIds,
      filteredSubjectIds: filteredList.map(item => item.id),
      setActiveTab,
      setCycleExpandedSubjectIds,
      setVerticalExpandedSubjectIds,
    },
  });

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
    return <PageLoadingState label="Carregando ciclo de estudos" />;
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
      onOpenImport={handleOpenImport}
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
    <SubjectsPageView
      cycleEntryState={cycleEntryState}
      hasActiveCycle={hasActiveCycle}
      isImportEditalModalOpen={isImportEditalModalOpen}
      modalLayerProps={{
        closeDifficultyModal,
        completeCycleConfirmOpen,
        cycleExamDateDraft,
        cycleExamDateEditorOpen,
        cycleExamDateError,
        deletePermanentConfirm,
        difficultyModalData,
        editaisNoCiclo: editaisNoCicloModalData,
        executeMarcarMateriaComoEstudada: executeMarkSubjectStudiedWithTimerGuard,
        handleDeletePermanent: handleDeletePermanentWithTimerGuard,
        handleDifficultyConfirmReview,
        handleDifficultyDiscard,
        handleDifficultyResume,
        handleDifficultySubmit,
        handleResetCycle: handleResetCycleWithTimerGuard,
        isImportEditalModalOpen,
        isResettingCycle,
        isRevertModalOpen,
        isReverting,
        isSavingCycleExamDate,
        isSavingTopicReview,
        mainSubjectUI,
        modalInitialTab,
        onCloseImportEditalModal: () => setIsImportEditalModalOpen(false),
        onCloseNotesModal: closeTopicNotes,
        onCloseRevertModal: handleCloseRevertModal,
        onCloseSubjectOriginChooser: handleCloseSubjectOriginChooser,
        onCloseSubjectsModal: handleCloseSubjectsModal,
        onCycleExamDateOpenChange: handleCycleExamDateEditorOpenChange,
        onDeletePermanentConfirmOpenChange: (open) => !open && setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, editais: [] }),
        onImportSubjects: handleImportSubjects,
        onResetCycleConfirmOpenChange: handleOpenResetCycleConfirmWithTimerGuard,
        onRevertMergeConfirm: handleRevertMergeConfirm,
        onSaveCycleExamDate: saveCycleExamDate,
        onSaveSubjectOriginName: handleSaveSubjectOriginName,
        onSetCycleExamDateDraft: setCycleExamDateDraft,
        onSetUnloadConfirmOpen: handleUnloadConfirmOpenChange,
        onSelectSubjectOrigin: handleSelectSubjectOrigin,
        onSubjectOriginNameDraftChange: handleSubjectOriginNameDraftChange,
        onSubjectsModalUpdate: handleSubjectsModalUpdate,
        onUnloadConfirm: handleUnloadConfirmWithTimerGuard,
        pendingCompleteSubjectId,
        resetCycleConfirmOpen,
        selectedMergeName,
        selectedMergeOriginals,
        selectedTopicForNotes,
        setCompleteCycleConfirmOpen,
        subjectOriginChooser,
        subjects,
        subjectsModal,
        unloadConfirm,
        unloadingEditalId,
      }}
      onGoToEditais={() => navigate('/meus-editais', { state: { filterCycle: hasActiveCycle } })}
      onOpenImport={handleOpenImport}
      showCycleWorkspace={showCycleWorkspace}
      workspace={mainSubjectUI}
    />
  );
};

export default Subjects;
