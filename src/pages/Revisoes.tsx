import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Loader2, Target, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

import { ReviewTopic, useReviewsData } from '@/hooks/useReviewsData';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useTimer } from '@/contexts/TimerContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useMergeData } from '@/hooks/useMergeData';
import { useTopicStudySessionFlow } from '@/hooks/useTopicStudySessionFlow';
import { getCanonicalSubjectName, getCanonicalTopicName } from '@/services/cycleMergeService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { buildActiveTopicScope, filterHistoryRowsByActiveTopicIds } from '@/utils/cycleAnalyticsScope';
import { getStudyCycleMetrics } from '@/utils/studyCycleMetrics';
import { buildLatestTrustedReviewTrendByTopic, type ReviewTrendHistoryRow } from '@/utils/reviewTrend';


import { RevisionStatus } from '@/types/revision';
import { PROGRAMMED_REVIEW_COUNT } from '@/utils/calculateNextReview';
import { buildReviewItems } from '@/utils/reviewsPageItems';
import { buildReviewStats, groupReviewItems } from '@/utils/reviewsPageDerived';
import { getReviewScheduleBucket } from '@/utils/reviewSchedule';

import { RevisoesHeader } from '@/components/revisoes/RevisoesHeader';
import { RevisoesChartsWrapper } from '@/components/revisoes/RevisoesChartsWrapper';
import { RevisoesToolbar } from '@/components/revisoes/RevisoesToolbar';
import { RevisoesList } from '@/components/revisoes/RevisoesList';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { CycleExamDateDialog } from '@/components/study-cycle/CycleExamDateDialog';
import { useCycleExamDateEditor } from '@/hooks/useCycleExamDateEditor';
import { STUDY_SESSION_DISCARDED_MESSAGE } from '@/utils/studySessionFeedback';
import { getStudyEmptyStateKind } from '@/utils/studyEntryState';
import { useReviewsPageAnalytics } from '@/hooks/useReviewsPageAnalytics';

// Modals are still kept here or inside List/Toolbar depending on usage
import { SpacedRepetitionInfoModal } from '@/components/reviews/SpacedRepetitionInfoModal';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { errorService } from '@/lib/errors/errorService';
import {
  PostStudyPracticeFlow,
  type PostStudyPracticeContext,
} from '@/features/practice/components/PostStudyPracticeFlow';

type ViewTab = 'FOCUS' | 'FUTURE' | 'COMPLETED' | 'SUBJECTS' | 'ALL';

const getFocusTopicId = (state: unknown): string | undefined => {
  if (typeof state !== 'object' || state === null || !('focusTopicId' in state)) return undefined;
  return typeof state.focusTopicId === 'string' ? state.focusTopicId : undefined;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '';

const normalizeRevisionKeyPart = (value: string) =>
  value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const Revisoes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { subjects, refreshData } = useApp();
  const { userCycle, setUserCycle, isLoading: isCycleLoading } = useCycleState();
  const { dynamicUnificationMap } = useMergeData();
  const { editaisData, editaisNoCiclo, getOriginsForTopic } = useEditalOriginsWithMerge();
  const [postStudyPractice, setPostStudyPractice] = useState<PostStudyPracticeContext | null>(null);
  
  const hasActiveCycle = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0;
  const hasAnyEdital = editaisData.length > 0 || subjects.length > 0;

  // Hooks
  const {
    markTopicAsReviewed,
    openReviewModal: openReviewModalHook,
    difficultyModalData,
    closeDifficultyModal,
    submitDifficultyRating,
    isLoading: isSavingReview
  } = useTopicReview();

  const {
    allTopics,
    topics,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics,
    consolidatedTopics,
    isRecoveryMode,
    recoveryReason,
    focusTopics,
    totalPendingCount,
    suggestedDailyReviews
  } = useReviewsData();
  const { handleTopicStudyAction } = useTopicStudySessionFlow({
    openReviewModal: openReviewModalHook,
  });

  const maxReviews = PROGRAMMED_REVIEW_COUNT;
  const cycleExamDate = userCycle?.exam_date || null;
  const hasCompositeCycle = editaisNoCiclo.length > 1;
  const examDate = cycleExamDate || (!hasCompositeCycle ? editaisNoCiclo[0]?.exam_date ?? null : null);

  const cycleTitle = useMemo(() => {
    if (editaisNoCiclo.length === 0) return undefined;
    if (editaisNoCiclo.length === 1) return editaisNoCiclo[0].name;
    return `${editaisNoCiclo.map(e => e.name).join(' + ')} (${editaisNoCiclo.length} editais unificados)`;
  }, [editaisNoCiclo]);

  const {
    editorOpen: isCycleExamDateDialogOpen,
    errorMessage: cycleExamDateErrorMessage,
    examDateDraft: cycleExamDateDraft,
    handleEditorOpenChange: handleCycleExamDateOpenChange,
    isSaving: isSavingCycleExamDate,
    openEditor: openCycleExamDateEditor,
    saveExamDate: saveCycleExamDate,
    setExamDateDraft: setCycleExamDateDraft,
  } = useCycleExamDateEditor({
    setUserCycle,
    userCycle,
    userId: user?.id,
  });
  const activeTopicScope = useMemo(
    () =>
      buildActiveTopicScope(
        (allTopics || []).map((topic) => ({
          id: topic.subject_id,
          topics: [{ id: topic.id }],
        })),
      ),
    [allTopics],
  );

  const {
    reviewData,
    refetchHistory,
    reviewTrendByTopic,
    refetchReviewTrends,
    firstContactStudyDurationsMinutes,
  } = useReviewsPageAnalytics(activeTopicScope);

  useEffect(() => {
    const handleTopicUpdate = () => {
      refetchHistory();
      refetchReviewTrends();
    };
    const handleExternalCompletion = (event: CustomEvent<{ topicId: string }>) => {
      if (difficultyModalData.isOpen && difficultyModalData.topicId === event.detail.topicId) {
        closeDifficultyModal();
      }
      refetch();
      refetchReviewTrends();
    };
    window.addEventListener('topicUpdated', handleTopicUpdate);
    window.addEventListener('external-topic-completed', handleExternalCompletion as EventListener);
    
    const handleRefresh = () => {
      refetch();
      refreshData();
    };

    window.addEventListener('cycleUpdated', handleRefresh);
    window.addEventListener('mergeUpdated', handleRefresh);
    window.addEventListener('subjectUpdated', handleRefresh);

    return () => {
      window.removeEventListener('topicUpdated', handleTopicUpdate);
      window.removeEventListener('external-topic-completed', handleExternalCompletion as EventListener);
      window.removeEventListener('cycleUpdated', handleRefresh);
      window.removeEventListener('mergeUpdated', handleRefresh);
      window.removeEventListener('subjectUpdated', handleRefresh);
    };
  }, [refetchHistory, refetchReviewTrends, difficultyModalData, closeDifficultyModal, refetch, refreshData]);

  const [activeTab, setActiveTab] = useState<ViewTab>('FOCUS');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [reviewStageFilter, setReviewStageFilter] = useState<string>('all');
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    [RevisionStatus.COMPLETED]: true,
    [RevisionStatus.CONSOLIDATED]: true
  });
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const lastReviewFocusPulseRef = useRef<{ key: string; topicId: string; at: number } | null>(null);

  const [headerCardsCollapsed, setHeaderCardsCollapsed] = useState<boolean>(false);

  const { activeTimer, resumeTimer, stopTimer, resetTimer, setProcessedUpdate } = useTimer();

  const getCanonicalReviewTopicKey = useCallback((topic: ReviewTopic) => {
    const subject = subjects.find(s => s.id === topic.subject_id);
    const rawSubjectName = subject?.name || 'Desconhecida';
    const canonicalSubjectName = getCanonicalSubjectName(topic.subject_id, rawSubjectName, dynamicUnificationMap);
    const canonicalTopicName = getCanonicalTopicName(topic.id, topic.name, dynamicUnificationMap);

    return `${normalizeRevisionKeyPart(canonicalSubjectName)}::${normalizeRevisionKeyPart(canonicalTopicName)}`;
  }, [dynamicUnificationMap, subjects]);

  const [notesModalData, setNotesModalData] = useState<{ isOpen: boolean; topicId: string; topicName: string; subjectName: string; }>({
    isOpen: false, topicId: '', topicName: '', subjectName: ''
  });
  const [subjectNotesModal, setSubjectNotesModal] = useState<{ isOpen: boolean; subjectId: string; subjectName: string; }>({
    isOpen: false, subjectId: '', subjectName: ''
  });

  const items = useMemo(() => buildReviewItems({
    sourceList: activeTab === 'FOCUS' ? focusTopics : topics,
    subjects,
    searchTerm,
    reviewStageFilter,
    activeTab,
    maxReviews,
    dynamicUnificationMap,
    editais: editaisData,
    getOriginsForTopic,
    hasCompositeCycle,
  }), [topics, focusTopics, subjects, searchTerm, reviewStageFilter, activeTab, maxReviews, dynamicUnificationMap, editaisData, getOriginsForTopic, hasCompositeCycle]);

  const stats = useMemo(() => buildReviewStats({ delayedTopics, todayTopics, futureTopics, completedTopics, consolidatedTopics, focusTopics, topics, subjects, reviewData, getCanonicalReviewTopicKey }), [todayTopics, delayedTopics, futureTopics, completedTopics, consolidatedTopics, focusTopics, subjects, topics, reviewData, getCanonicalReviewTopicKey]);

  const reviewPace = useMemo(() => {
    return getStudyCycleMetrics({
      subjects: allTopics.map(topic => ({
        id: topic.subject_id,
        topics: [{
          id: topic.id,
          completed: topic.completed,
          first_studied_at: topic.first_studied_at,
          next_review: topic.next_review,
          review_count: topic.review_count,
        }],
      })),
      cycleExamDate: examDate,
      firstContactStudyDurationsMinutes,
      hasActiveCycle: Boolean(hasActiveCycle),
    }).pace;
  }, [allTopics, examDate, firstContactStudyDurationsMinutes, hasActiveCycle]);

  const groupedItems = useMemo(() => groupReviewItems(items, activeTab), [items, activeTab]);

  const location = useLocation();
  const focusedTopicId = getFocusTopicId(location.state) || searchParams.get('topicId');
  const focusPulseKey = focusedTopicId ? `${focusedTopicId}:${location.key}` : null;

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (subjectId) {
      setActiveTab('SUBJECTS');
      return;
    }

    if (focusedTopicId) return;
    const tabByQuery: Record<string, ViewTab> = {
      hoje: 'FOCUS',
      atrasadas: 'FOCUS',
      futuras: 'FUTURE',
      concluidas: 'COMPLETED',
      todas: 'ALL',
    };
    const target = tabByQuery[searchParams.get('tab') || ''];
    if (target && activeTab !== target) setActiveTab(target);
  }, [activeTab, focusedTopicId, searchParams]);

  useEffect(() => {
    const topicId = focusedTopicId;
    if (topicId) {
      const raw = topics.find(t => t.id === topicId);
      if (raw) {
        let target: ViewTab = 'FOCUS';
        const bucket = getReviewScheduleBucket(raw);

        if (bucket === 'completed') {
          target = 'COMPLETED';
        } else if (bucket === 'unstarted' || bucket === 'unscheduled') {
          target = 'ALL';
        } else if (bucket === 'future') {
          target = 'FUTURE';
        }

        if (activeTab !== target) setActiveTab(target);
        if (searchTerm || reviewStageFilter !== 'all') { setSearchTerm(''); setReviewStageFilter('all'); }
        if (!searchParams.get('topicId')) setSearchParams(prev => { prev.set('topicId', topicId); return prev; });
      }
    }
  }, [
    searchParams,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics,
    consolidatedTopics,
    focusTopics,
    activeTab,
    searchTerm,
    reviewStageFilter,
    setSearchParams,
    setSearchTerm,
    setReviewStageFilter,
    focusedTopicId,
    topics
  ]);

  useEffect(() => {
    const evaluationTopicId = (location.state as { openEvaluationForTopic?: string } | null)?.openEvaluationForTopic;
    if (!evaluationTopicId) return;

    const timer = setTimeout(() => {
      handleMarkCompleted(evaluationTopicId);
      window.history.replaceState({}, '');
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);


  useEffect(() => {
    if (!focusedTopicId || !focusPulseKey) return undefined;

    let frameId = 0;
    const timer = setTimeout(() => {
      const el = document.getElementById(`topic-${focusedTopicId}`);
      if (el) {
        const now = Date.now();
        const lastPulse = lastReviewFocusPulseRef.current;
        if (
          lastPulse?.key === focusPulseKey ||
          (lastPulse?.topicId === focusedTopicId && now - lastPulse.at < 1800)
        ) {
          return;
        }

        lastReviewFocusPulseRef.current = {
          key: focusPulseKey,
          topicId: focusedTopicId,
          at: now,
        };
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedTopicId(null);
        frameId = window.requestAnimationFrame(() => setHighlightedTopicId(focusedTopicId));
        return;
      }

      Object.entries(groupedItems).forEach(([k, v]) => {
        if (v.some(i => i.id === focusedTopicId) && collapsedGroups[k]) {
          setCollapsedGroups(prev => ({ ...prev, [k]: false }));
        }
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [groupedItems, collapsedGroups, focusedTopicId, focusPulseKey]);

  useEffect(() => {
    if (highlightedTopicId) {
      const t = setTimeout(() => {
        setHighlightedTopicId(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('topicId');
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
      }, 1700);
      return () => clearTimeout(t);
    }
  }, [highlightedTopicId]);

  useEffect(() => {
    if (searchTerm || reviewStageFilter !== 'all') setCollapsedGroups({});
  }, [searchTerm, reviewStageFilter]);

  useEffect(() => {
    const handleVisibilityChange = () => { if (!document.hidden) { refetch(); refreshData(); } };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch, refreshData]);

  // Handler Wrappers
  const handleMarkCompleted = async (id: string) => {
    const opensEvaluationModal = activeTimer?.topicId === id && activeTimer.status === 'RUNNING';

    if (opensEvaluationModal) {
      setLoadingActions(prev => ({ ...prev, [id]: 'review' }));
    }

    try {
      await handleTopicStudyAction(id);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Revisoes',
          action: 'handleMarkCompleted',
          userMessage: 'Erro ao abrir modal de revisão.',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    } finally {
      if (opensEvaluationModal) {
        setLoadingActions(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  const handleAiAssist = () => {
    toast.info('Assistente de revisão em preparação. Use as anotações e a dificuldade por enquanto.');
  };

  const areAllExpanded = Object.keys(groupedItems).length > 0 && Object.keys(groupedItems).every(k => !collapsedGroups[k]);
  const handleToggleAll = () => {
    if (areAllExpanded) setCollapsedGroups(Object.keys(groupedItems).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    else setCollapsedGroups({});
  };

  if (isLoading || isCycleLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!hasActiveCycle) {
    const emptyStateKind = getStudyEmptyStateKind({
      editalCount: editaisData.length || (hasAnyEdital ? 1 : 0),
      editaisWithContentCount: editaisData.filter(edital => edital.subject_ids.length > 0).length,
      hasAnyContent: subjects.length > 0,
      hasActiveCycle: false,
    });

    return (
      <div className="w-full px-4 md:px-8">
        <StudyEmptyState
          kind={emptyStateKind ?? 'no-edital'}
          variant="center"
          onAction={() => navigate('/meus-editais')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative w-full overflow-x-hidden">

      <div className="flex-1 flex flex-col relative w-full max-w-[1600px] mx-auto pb-24 lg:pb-8">

        {/* 1. Header (KPIs) - Order 1 (Default) */}
        {stats.totalTopics > 0 && (
          <div className="mt-0 mb-4 shrink-0 px-4 md:px-8 w-full order-1">
            <RevisoesHeader
              stats={stats}
              pace={reviewPace}
              cycleTitle={cycleTitle}
              onOpenExamDateEditor={openCycleExamDateEditor}
              isCollapsed={headerCardsCollapsed}
              onToggle={(val) => {
                setHeaderCardsCollapsed(val);
                localStorage.setItem('revisoes-header-collapsed', String(val));
              }}
            />
          </div>
        )}

        {/* 2. Charts - Order 2 (Both Mobile & Desktop) */}
        {/* Previously order-last on mobile. User requested "Cards" before Toolbar. */}
        {stats.totalTopics > 0 && (
          <div className="px-4 md:px-8 shrink-0 w-full mb-4 order-2">
            <RevisoesChartsWrapper
              isVisible={!headerCardsCollapsed}
              stats={stats}
              studyTopics={allTopics}
              topics={items}
              reviewData={reviewData || []}
              subjects={subjects}
              maxReviews={maxReviews}
            />
          </div>
        )}

        {/* 3. Toolbar - Sticky - Order 3 */}
        <div className="sticky top-14 z-20 bg-transparent px-4 md:px-8 py-2 shrink-0 transition-all w-full order-3">
          {isRecoveryMode && activeTab === 'FOCUS' && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-warning shadow-sm">
              <div className="shrink-0 rounded-xl bg-warning/12 p-2">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-foreground">Revisões prioritárias</h3>
                <p className="text-xs leading-relaxed text-content-muted">
                  Você possui {stats.overdue + stats.today} {stats.overdue + stats.today === 1 ? 'tópico aguardando revisão' : 'tópicos aguardando revisão'}. A lista prioriza o que está vencido ou previsto para hoje.
                </p>
              </div>
            </div>
          )}

          {/* Foco de Hoje (Normal) */}
          {!isRecoveryMode && focusTopics.length > 0 && activeTab === 'FOCUS' && (
            <div className="mb-4 flex items-center gap-2 text-sm text-content-muted bg-secondary px-4 py-2 rounded-xl border border-border">
              <span className="font-medium text-foreground">
                Foco de hoje: {focusTopics.length} {focusTopics.length === 1 ? 'tópico' : 'tópicos'}.
              </span>
              <span className="opacity-90 ml-1">
                {stats.overdue > 0 
                  ? `(Sendo ${stats.today} de hoje e ${stats.overdue} em atraso)`
                  : '(Tudo em dia! Siga o cronograma planejado)'
                }
              </span>
            </div>
          )}

          {/* 4. Toolbar (Search, Filter, Tabs) */}
          {stats.totalTopics > 0 && (
            <RevisoesToolbar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setSearchParams((previous) => {
                  const next = new URLSearchParams(previous);
                  const tabByView: Partial<Record<ViewTab, string>> = {
                    FOCUS: 'hoje',
                    FUTURE: 'futuras',
                    COMPLETED: 'concluidas',
                    ALL: 'todas',
                  };
                  const queryTab = tabByView[tab];
                  if (queryTab) next.set('tab', queryTab);
                  else next.delete('tab');
                  return next;
                });
              }}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              reviewStageFilter={reviewStageFilter}
              setReviewStageFilter={setReviewStageFilter}
              stats={stats}
              areAllExpanded={areAllExpanded}
              onToggleAll={handleToggleAll}
              onToggleSubjectView={() => setActiveTab(prev => prev === 'SUBJECTS' ? 'FOCUS' : 'SUBJECTS')}
              onOpenInfoModal={() => setIsInfoModalOpen(true)}
              className="mb-6 sticky top-[72px] z-30" // Sticky top adjusted for 72px header
              isRecoveryMode={isRecoveryMode}
            />
          )}
          {/* Search Notification (Feedback) */}
          {(searchTerm || reviewStageFilter !== 'all') && (
            <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center bg-amber-50/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                    <AlertCircle size={14} className="text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      {searchTerm ? `Pesquisando por "${searchTerm}"` : `Filtrando por Ciclo R${reviewStageFilter}`}
                    </span>
                    <span className="text-[10px] opacity-70">
                      Encontrados {Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0)} tópicos
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setSearchTerm(''); setReviewStageFilter('all'); }}
                  className="px-3 py-1 bg-card dark:bg-slate-800 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-accent transition-all"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. List Content - Order 4 */}
        <main className="flex-1 px-4 md:px-8 pt-2 shrink-0 space-y-6 w-full order-4">
          <RevisoesList
            activeTab={activeTab}
            groupedItems={groupedItems}
            collapsedGroups={collapsedGroups}
            setCollapsedGroups={setCollapsedGroups}
            stats={stats}
            activeTimer={activeTimer}
            highlightedTopicId={highlightedTopicId}
            trendByTopic={reviewTrendByTopic}
            loadingActions={loadingActions}
            handleMarkCompleted={handleMarkCompleted}
            handleAiAssist={handleAiAssist}
            openNotesModal={(tId, tName, sName) => setNotesModalData({ isOpen: true, topicId: tId, topicName: tName, subjectName: sName })}
            setSearchTerm={setSearchTerm}
            setReviewStageFilter={setReviewStageFilter}
          />
        </main>
      </div>

      {/* Legacy Modals */}
      <NotesModal
        isOpen={notesModalData.isOpen}
        onClose={() => { setNotesModalData(p => ({ ...p, isOpen: false })); setTimeout(() => { refreshData(); refetch(); }, 200); }}
        onSave={() => { setNotesModalData(p => ({ ...p, isOpen: false })); setTimeout(() => { refreshData(); refetch(); }, 200); }}
        topicId={notesModalData.topicId}
        topicName={notesModalData.topicName}
        subjectName={notesModalData.subjectName}
        showSubjectNotes={false}
      />
      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => { setSubjectNotesModal(p => ({ ...p, isOpen: false })); setTimeout(() => { refreshData(); refetch(); }, 200); }}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />
      <DifficultyRatingModal
        isOpen={difficultyModalData.isOpen}
        onClose={() => { closeDifficultyModal(); }}
        onResume={() => { closeDifficultyModal(); resumeTimer(); }}
        onSubmit={async (d) => { await submitDifficultyRating(d); refetch(); }}
        isSaving={isSavingReview}
        onConfirmReview={async (d, dur) => {
          try {
            setProcessedUpdate(difficultyModalData.topicId);
            await markTopicAsReviewed(difficultyModalData.topicId, d, dur, difficultyModalData.reviewCount - 1);
            const shouldOfferPractice = difficultyModalData.reviewCount === 1 || d === 3;
            if (shouldOfferPractice) {
              setPostStudyPractice({
                topicId: difficultyModalData.topicId,
                topicName: difficultyModalData.topicName,
                subjectName: difficultyModalData.subjectName,
                contact: difficultyModalData.reviewCount === 1 ? 'first_contact' : 'review',
                difficulty: d,
              });
            }
            stopTimer(); closeDifficultyModal(); setTimeout(() => { refreshData(); refetch(); }, 500);
          } catch (e: unknown) {
            await errorService.report(
              e,
              {
                module: 'Revisoes',
                action: 'onConfirmReview',
                userMessage: 'Erro ao salvar revisão.',
                severity: 'high',
                scope: 'core',
                userId: user?.id
              }
            );
            if (getErrorMessage(e).includes('SYNC_ERROR')) toast.warning("Sincronismo: Já processada.");
            closeDifficultyModal(); stopTimer(); setTimeout(() => { refreshData(); refetch(); }, 500);
          }
        }}
        onDiscard={() => { stopTimer(); resetTimer(); closeDifficultyModal(); toast.info(STUDY_SESSION_DISCARDED_MESSAGE); }}
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
        reviewStage={difficultyModalData.reviewStage}
        reviewCount={difficultyModalData.reviewCount}
        isCompleting={difficultyModalData.isCompleting}
        duration={difficultyModalData.duration}
      />
      <SpacedRepetitionInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        hasExamDate={editaisData.some(edital => Boolean(edital.exam_date))}
      />
      <CycleExamDateDialog
        errorMessage={cycleExamDateErrorMessage}
        examDate={cycleExamDateDraft}
        isOpen={isCycleExamDateDialogOpen}
        isSaving={isSavingCycleExamDate}
        onExamDateChange={setCycleExamDateDraft}
        onOpenChange={handleCycleExamDateOpenChange}
        onSave={saveCycleExamDate}
      />
      <PostStudyPracticeFlow
        userId={user?.id}
        context={postStudyPractice}
        onDismiss={() => setPostStudyPractice(null)}
      />
    </div>
  );
};

export default Revisoes;
