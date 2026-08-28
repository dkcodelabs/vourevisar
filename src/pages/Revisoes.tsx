import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format, startOfDay } from 'date-fns';
import { AlertCircle, Loader2, Target, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { buildReviewOriginMetadata } from '@/utils/reviewOriginLabels';
import { buildLatestTrustedReviewTrendByTopic, type ReviewTrendHistoryRow } from '@/utils/reviewTrend';


import { ReviewHistoryItem, RevisionItem, RevisionStatus } from '@/types/revision';
import { PROGRAMMED_REVIEW_COUNT } from '@/utils/calculateNextReview';
import { getProgrammedReviewsCompleted, isReviewProgramCompleted } from '@/utils/reviewStage';

import { RevisoesHeader } from '@/components/revisoes/RevisoesHeader';
import { RevisoesChartsWrapper } from '@/components/revisoes/RevisoesChartsWrapper';
import { RevisoesToolbar } from '@/components/revisoes/RevisoesToolbar';
import { RevisoesList } from '@/components/revisoes/RevisoesList';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { CycleExamDateDialog } from '@/components/study-cycle/CycleExamDateDialog';
import { useCycleExamDateEditor } from '@/hooks/useCycleExamDateEditor';
import { STUDY_SESSION_DISCARDED_MESSAGE } from '@/utils/studySessionFeedback';
import { getStudyEmptyStateKind } from '@/utils/studyEntryState';

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

const getRevisionItemKey = (item: RevisionItem) =>
  `${normalizeRevisionKeyPart(item.subject)}::${normalizeRevisionKeyPart(item.topic)}`;

const getRevisionStatusPriority = (status: RevisionStatus) => {
  switch (status) {
    case RevisionStatus.CONSOLIDATED:
      return 6;
    case RevisionStatus.COMPLETED:
      return 5;
    case RevisionStatus.OVERDUE:
      return 4;
    case RevisionStatus.TODAY:
      return 3;
    case RevisionStatus.FUTURE:
      return 2;
    case RevisionStatus.UNSTARTED:
      return 1;
    default:
      return 0;
  }
};

const chooseRevisionItemRepresentative = (current: RevisionItem, candidate: RevisionItem) => {
  const currentPriority = getRevisionStatusPriority(current.status);
  const candidatePriority = getRevisionStatusPriority(candidate.status);

  if (currentPriority !== candidatePriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }

  const currentReviewCount = current.reviewCount || 0;
  const candidateReviewCount = candidate.reviewCount || 0;
  if (currentReviewCount !== candidateReviewCount) {
    return candidateReviewCount > currentReviewCount ? candidate : current;
  }

  const currentDueTime = current.dueDate ? new Date(current.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const candidateDueTime = candidate.dueDate ? new Date(candidate.dueDate).getTime() : Number.POSITIVE_INFINITY;
  return candidateDueTime < currentDueTime ? candidate : current;
};

const dedupeRevisionItemsByCanonicalName = (items: RevisionItem[]) => {
  const order: string[] = [];
  const itemByKey = new Map<string, RevisionItem>();

  for (const item of items) {
    const key = getRevisionItemKey(item);
    const current = itemByKey.get(key);

    if (!current) {
      order.push(key);
      itemByKey.set(key, item);
      continue;
    }

    itemByKey.set(key, chooseRevisionItemRepresentative(current, item));
  }

  return order.map(key => itemByKey.get(key)).filter((item): item is RevisionItem => Boolean(item));
};

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

  const { data: reviewData, refetch: refetchHistory } = useQuery({
    queryKey: ['reviews-page-history', user?.id, activeTopicScope.scopeKey],
    queryFn: async () => {
      try {
        if (!user) throw new Error('User not authenticated');
        if (!activeTopicScope.hasScopedData) return [];

        const response = await supabase
          .from('topic_review_history')
          .select(`
          id, topic_id, review_stage, reviewed_at,
          topics!inner (id, name, subject_id)
        `)
          .eq('user_id', user.id)
          .in('topic_id', activeTopicScope.activeTopicIds)
          .order('reviewed_at', { ascending: false });

        if (response.error) throw response.error;
        return filterHistoryRowsByActiveTopicIds(response.data || [], activeTopicScope.activeTopicIds).map((review): ReviewHistoryItem => {
          const topic = Array.isArray(review.topics) ? review.topics[0] : review.topics;
          return {
          id: review.id,
          topic_id: review.topic_id,
          review_stage: review.review_stage,
          reviewed_at: review.reviewed_at,
          topic_name: topic?.name,
          subject_id: topic?.subject_id
        }});
      } catch (error) {
        // Log the error but rethrow so react-query handles the state
        await errorService.report(
          error,
          {
            module: 'Revisoes',
            action: 'fetchHistory',
            userMessage: 'Erro ao carregar histórico de revisões.',
            severity: 'low',
            scope: 'core',
            userId: user?.id
          }
        );
        throw error;
      }
    },
    enabled: !!user
  });

  const { data: reviewTrendByTopic = new Map(), refetch: refetchReviewTrends } = useQuery({
    queryKey: ['reviews-page-trends', user?.id, activeTopicScope.scopeKey],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!activeTopicScope.hasScopedData) return new Map();

      const { data, error } = await supabase
        .from('topic_review_history')
        .select('topic_id, trend_label, trend_delta, reviewed_at')
        .eq('user_id', user.id)
        .in('topic_id', activeTopicScope.activeTopicIds)
        .not('trend_label', 'is', null)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      return buildLatestTrustedReviewTrendByTopic((data || []) as ReviewTrendHistoryRow[]);
    },
    enabled: Boolean(user?.id && activeTopicScope.hasScopedData),
  });

  const { data: firstContactStudyDurationsMinutes = [] } = useQuery({
    queryKey: ['reviews-first-contact-durations', user?.id, userCycle?.id],
    queryFn: async () => {
      if (!user?.id || !userCycle?.id) return [];

      const { data, error } = await supabase
        .from('study_sessions')
        .select('session_duration_minutes')
        .eq('user_id', user.id)
        .eq('cycle_id', userCycle.id)
        .eq('contact_type', 'first_contact')
        .not('session_duration_minutes', 'is', null);

      if (error) throw error;

      return (data || [])
        .map(session => session.session_duration_minutes)
        .filter((minutes): minutes is number =>
          typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
        );
    },
    enabled: Boolean(user?.id && userCycle?.id),
  });

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



  // State
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

  // Header State
  const [headerCardsCollapsed, setHeaderCardsCollapsed] = useState<boolean>(false);

  const { activeTimer, resumeTimer, stopTimer, resetTimer, setProcessedUpdate } = useTimer();

  const getCanonicalReviewTopicKey = useCallback((topic: ReviewTopic) => {
    const subject = subjects.find(s => s.id === topic.subject_id);
    const rawSubjectName = subject?.name || 'Desconhecida';
    const canonicalSubjectName = getCanonicalSubjectName(topic.subject_id, rawSubjectName, dynamicUnificationMap);
    const canonicalTopicName = getCanonicalTopicName(topic.id, topic.name, dynamicUnificationMap);

    return `${normalizeRevisionKeyPart(canonicalSubjectName)}::${normalizeRevisionKeyPart(canonicalTopicName)}`;
  }, [dynamicUnificationMap, subjects]);

  // Modals Data State
  const [notesModalData, setNotesModalData] = useState<{ isOpen: boolean; topicId: string; topicName: string; subjectName: string; }>({
    isOpen: false, topicId: '', topicName: '', subjectName: ''
  });
  const [subjectNotesModal, setSubjectNotesModal] = useState<{ isOpen: boolean; subjectId: string; subjectName: string; }>({
    isOpen: false, subjectId: '', subjectName: ''
  });

  // Data processing
  const items: RevisionItem[] = useMemo(() => {
    // Determine Source List
    const sourceList = activeTab === 'FOCUS' ? focusTopics : topics;
    const allItems: RevisionItem[] = [];

    const mapTopicToItem = (topic: ReviewTopic): RevisionItem => {
      const subject = subjects.find(s => s.id === topic.subject_id);
      const rawCount = topic.review_count || 0;
      const programCompleted = isReviewProgramCompleted(topic);
      const reviewCount = getProgrammedReviewsCompleted(
        rawCount,
        programCompleted,
      );

      const rawSubjectName = subject?.name || 'Desconhecida';
      const canonicalSubjectName = getCanonicalSubjectName(topic.subject_id, rawSubjectName, dynamicUnificationMap);
      const canonicalTopicName = getCanonicalTopicName(topic.id, topic.name, dynamicUnificationMap);
      const originMetadata = buildReviewOriginMetadata({
        editais: editaisData,
        sourceEditalIds: topic.source_edital_ids,
        fallbackOrigins: getOriginsForTopic(topic.id, topic.subject_id, topic.edital_id || undefined),
        showInCompositeCycle: hasCompositeCycle,
      });

      // Determine Status Dynamically - Use local date strings for consistency with hook
      let status = RevisionStatus.UNSTARTED;
      const isActuallyStarted = (topic.review_count || 0) > 0;

      if (programCompleted) {
        status = RevisionStatus.CONSOLIDATED;
      } else if (topic.next_review && isActuallyStarted) {
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const reviewDateStr = format(startOfDay(new Date(topic.next_review)), 'yyyy-MM-dd');
        
        if (reviewDateStr < todayStr) status = RevisionStatus.OVERDUE;
        else if (reviewDateStr === todayStr) status = RevisionStatus.TODAY;
        else status = RevisionStatus.FUTURE;
      }

      return {
        id: topic.id,
        topic: canonicalTopicName,
        subject: canonicalSubjectName,
        subjectId: topic.subject_id,
        difficulty: topic.difficulty_level || 0,
        dueDate: topic.next_review || new Date().toISOString(),
        notes: typeof topic.notes === 'string'
          ? topic.notes
          : (topic.notes && typeof topic.notes === 'object' && 'content' in topic.notes
              ? String(topic.notes.content || '')
              : ''),
        status: status,
        ownerImage: '',
        reviewCount,
        maxReviews,
        learningStatus: topic.learningStatus,
        memoryStability: topic.memory_stability,
        originSummary: originMetadata.summary,
        originLabels: originMetadata.labels,
        isMergedOrigin: originMetadata.isMergedOrigin,
        showOrigin: originMetadata.shouldShow,
        incidenceLevel: topic.incidence_level,
        totalVolume: topic.total_volume,
      };
    };

    sourceList.forEach(t => allItems.push(mapTopicToItem(t)));

    let result = dedupeRevisionItemsByCanonicalName(allItems);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => i.topic.toLowerCase().includes(lower) || i.subject.toLowerCase().includes(lower));
    }
    if (reviewStageFilter !== 'all') {
      const target = parseInt(reviewStageFilter);
      result = result.filter(i => i.reviewCount === target);
    }

    // Filter logic for sections (Tab Focus / Today)
    if (activeTab === 'FOCUS') {
      // Show only started reviews that are Today or Overdue
      result = result.filter(item => 
        (item.status === RevisionStatus.TODAY || item.status === RevisionStatus.OVERDUE)
      );
    }
    
    if (activeTab === 'COMPLETED') {
      result = result.filter(i => i.status === RevisionStatus.CONSOLIDATED);
    }

    return result;
  }, [topics, focusTopics, subjects, searchTerm, reviewStageFilter, activeTab, maxReviews, dynamicUnificationMap, editaisData, getOriginsForTopic, hasCompositeCycle]);


  const stats = useMemo(() => {
    const allTopics = [...delayedTopics, ...todayTopics, ...futureTopics, ...completedTopics, ...consolidatedTopics];
    const totalTopics = new Set(topics.map(getCanonicalReviewTopicKey)).size;
    const totalSubjects = subjects.length; // Added
    const completedReviews = completedTopics.length + consolidatedTopics.length;
    const totalScheduledReviews = delayedTopics.length + todayTopics.length + futureTopics.length + completedReviews;
    const focusCount = new Set(focusTopics.map(getCanonicalReviewTopicKey)).size;
    return {
      today: todayTopics.length,
      overdue: delayedTopics.length,
      future: futureTopics.length,
      completedTopicsCount: consolidatedTopics.length,
      completedReviews,
      totalScheduledReviews,
      startedTopicsCount: allTopics.length,
      focusCount,
      totalTopics,
      totalSubjects,
    };
  }, [todayTopics, delayedTopics, futureTopics, completedTopics, consolidatedTopics, focusTopics, subjects, topics, getCanonicalReviewTopicKey]);

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

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: RevisionItem[] } = {};
    if (activeTab === 'SUBJECTS') {
      items.forEach(i => {
        if (!groups[i.subject]) groups[i.subject] = [];
        groups[i.subject].push(i);
      });
    } else if (activeTab === 'FOCUS') {
      // Focus Tab -> Single Group
      if (items.length > 0) groups['FOCUS_MERGED'] = items;
    } else {
      if (activeTab === 'ALL') {
        Object.values(RevisionStatus).forEach(s => groups[s] = []);
        items.forEach(i => { if (!groups[i.status]) groups[i.status] = []; groups[i.status].push(i); });
      } else {
        const targets: string[] = [];
        if (activeTab === 'FUTURE') targets.push(RevisionStatus.FUTURE);
        else if (activeTab === 'COMPLETED') targets.push(RevisionStatus.CONSOLIDATED);
        targets.forEach(s => groups[s] = []);
        items.forEach(i => { if (targets.includes(i.status)) groups[i.status].push(i); });
      }
    }
    return groups;
  }, [items, activeTab]);

  // Effects (URL params, Smart Nav, Highlight) - preserved largely
  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (subjectId) setActiveTab('SUBJECTS');
  }, [searchParams]);

  const location = useLocation();
  const focusedTopicId = getFocusTopicId(location.state) || searchParams.get('topicId');
  const focusPulseKey = focusedTopicId ? `${focusedTopicId}:${location.key}` : null;

  useEffect(() => {
    const topicId = focusedTopicId;
    if (topicId) {
      const raw = topics.find(t => t.id === topicId);
      if (raw) {
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        let target: ViewTab = 'FOCUS';
        const isActuallyStarted = (raw.review_count || 0) > 0;
        
        if (isReviewProgramCompleted(raw)) {
          target = 'COMPLETED';
        } else if (!isActuallyStarted) {
          target = 'ALL';
        } else if (raw.next_review) {
          const rDate = format(startOfDay(new Date(raw.next_review)), 'yyyy-MM-dd');
          if (rDate <= todayStr) target = 'FOCUS';
          else target = 'FUTURE';
        } else {
          target = 'ALL';
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

  // When coming from "Parar e Avaliar" in FocusModal: auto-open the review modal
  useEffect(() => {
    const evaluationTopicId = (location.state as { openEvaluationForTopic?: string } | null)?.openEvaluationForTopic;
    if (!evaluationTopicId) return;

    // Small delay to ensure data is loaded
    const timer = setTimeout(() => {
      handleMarkCompleted(evaluationTopicId);
      // Clear state so it doesn't re-trigger on re-renders
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
              setActiveTab={setActiveTab}
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
        strategicIncidenceLabel={difficultyModalData.strategicIncidenceLabel}
        strategicIncidenceDescription={difficultyModalData.strategicIncidenceDescription}
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
