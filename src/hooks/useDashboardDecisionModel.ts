import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, isAfter, parseISO, startOfDay, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useReviewsData } from '@/hooks/useReviewsData';
import { useStudyCycleData } from '@/hooks/useStudyCycleData';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { ReviewInterval, SubjectStatus } from '@/types/study-cycle';
import {
  buildActionQueue,
  buildDashboardPace,
  buildNextBestAction,
  buildProgressSummary,
  getDashboardEditalIdentity,
  getNextCycleActions,
  getDashboardDataIssues,
  getDashboardCriticalError,
  normalizeReminderDate,
  resolveDashboardNavigation,
} from '@/utils/dashboardDecision';
import { buildActiveTopicScope, filterHistoryRowsByActiveTopicIds } from '@/utils/cycleAnalyticsScope';
import { toastManager } from '@/utils/toastManager';
import type {
  DashboardCycleSubject,
  DashboardDecisionModel,
  DashboardNavigate,
  DashboardDataIssueSource,
  DashboardReminder,
  DashboardRecentPaceDay,
  DashboardReviewTopic,
} from '@/types/dashboardDecision';
import { getStudyEmptyStateKind } from '@/utils/studyEntryState';

const toLocalDate = (date: string) => (date.length === 10 ? parseISO(date) : new Date(date));
const DASHBOARD_PACE_WINDOW_DAYS = 7;

const toReviewTopic = (topic: {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  next_review: string | null;
  review_count: number;
  difficulty_level?: number | null;
  memory_stability?: number | null;
  current_interval?: number | null;
}): DashboardReviewTopic => ({
  id: topic.id,
  name: topic.name,
  subjectId: topic.subject_id,
  subjectName: topic.subject_name,
  nextReview: topic.next_review,
  reviewCount: topic.review_count ?? 0,
  difficultyLevel: topic.difficulty_level ?? null,
  memoryStability: topic.memory_stability ?? null,
  currentInterval: topic.current_interval ?? null,
});

interface DashboardActivityHistoryRow {
  topic_id: string | null;
  review_stage: string | null;
  reviewed_at: string;
}

const buildActivityDays = (rows: DashboardActivityHistoryRow[], days: number): DashboardRecentPaceDay[] => {
  const today = startOfDay(new Date());
  const map = new Map<string, DashboardRecentPaceDay>();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(subDays(today, index), 'yyyy-MM-dd');
    map.set(date, {
      date,
      studiedCount: 0,
      reviewedCount: 0,
    });
  }

  for (const row of rows) {
    const date = format(startOfDay(new Date(row.reviewed_at)), 'yyyy-MM-dd');
    const day = map.get(date);
    if (!day) continue;

    const stage = String(row.review_stage || '').toLowerCase();
    const type = stage.includes('quest')
      ? 'questions'
      : row.review_stage === 'Primeiro Contato' || row.review_stage === 'first_contact'
        ? 'study'
        : 'review';

    if (type === 'study') day.studiedCount += 1;
    if (type === 'review') day.reviewedCount += 1;
  }

  return Array.from(map.values());
};

export const useDashboardDecisionModel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reviewsData = useReviewsData();
  const cycleData = useStudyCycleData();
  const { editaisData, editaisNoCiclo, isLoading: isEditaisLoading, error: editaisError } = useEditalOriginsWithMerge();

  const activeEdital = editaisNoCiclo[0];
  const hasActiveCycle = Boolean(cycleData.userCycle?.ciclo_atual?.length);
  const hasCompositeCycle = editaisNoCiclo.length > 1;
  const cycleExamDate = cycleData.userCycle?.exam_date ?? null;
  const examDate = cycleExamDate || (!hasCompositeCycle ? activeEdital?.exam_date ?? null : null);
  const cycleDisplayName = typeof cycleData.userCycle?.name === 'string' && cycleData.userCycle.name.trim()
    ? cycleData.userCycle.name.trim()
    : null;

  const dashboardSubjects = useMemo<DashboardCycleSubject[]>(
    () =>
      cycleData.studyCycleSubjects.map((subject, index) => ({
        id: subject.id,
        name: subject.name,
        cyclePosition: subject.cyclePosition ?? index + 1,
        isCompletedInCycle:
          subject.status === SubjectStatus.COMPLETED_CYCLE || subject.status === SubjectStatus.FINISHED,
        topics: subject.topics.map((topic) => ({
          id: topic.id,
          name: topic.name,
          subjectId: subject.id,
          subjectName: subject.name,
          firstStudiedAt: topic.reviewStatus !== ReviewInterval.NOT_STARTED ? 'started' : null,
          reviewCount: topic.reviewCount ?? 0,
          completed: topic.reviewStatus === ReviewInterval.COMPLETED,
          nextReview: topic.nextReviewDate ?? null,
          difficultyLevel:
            topic.difficulty === 'EASY' ? 1 : topic.difficulty === 'HARD' ? 3 : topic.difficulty === 'MEDIUM' ? 2 : null,
        })),
      })),
    [cycleData.studyCycleSubjects],
  );
  const activeTopicScope = useMemo(() => buildActiveTopicScope(dashboardSubjects), [dashboardSubjects]);

  const overdueReviews = useMemo(() => reviewsData.delayedTopics.map(toReviewTopic), [reviewsData.delayedTopics]);
  const todayReviews = useMemo(() => reviewsData.todayTopics.map(toReviewTopic), [reviewsData.todayTopics]);
  const futureReviews = useMemo(() => reviewsData.futureTopics.map(toReviewTopic), [reviewsData.futureTopics]);

  const futureReviewsInWindow = useMemo(() => {
    if (!examDate) return futureReviews.length;
    const exam = startOfDay(toLocalDate(examDate));
    return futureReviews.filter((topic) => {
      if (!topic.nextReview) return false;
      const due = startOfDay(new Date(topic.nextReview));
      return !isAfter(due, exam);
    }).length;
  }, [examDate, futureReviews]);

  const cycleActions = useMemo(() => getNextCycleActions(dashboardSubjects, 3), [dashboardSubjects]);
  const progressSummary = useMemo(() => buildProgressSummary(dashboardSubjects), [dashboardSubjects]);

  const { data: reminders = [], isLoading: isRemindersLoading, error: remindersError, refetch: refetchReminders } = useQuery({
    queryKey: ['dashboard-reminders', user?.id],
    queryFn: async (): Promise<DashboardReminder[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('general_reminders')
        .select('id, text, reminder_date, completed, created_at, completed_at')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('reminder_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        text: item.text,
        reminderDate: normalizeReminderDate(item.reminder_date),
        completed: Boolean(item.completed),
        createdAt: item.created_at,
        completedAt: item.completed_at,
        href: '#lembretes',
      }));
    },
    enabled: Boolean(user?.id),
  });

  const { data: activityDays = [], isLoading: isActivityLoading, error: activityError, refetch: refetchActivity } = useQuery({
    queryKey: ['dashboard-recent-pace', user?.id, activeTopicScope.scopeKey],
    queryFn: async () => {
      if (!user?.id) return [];
      if (!activeTopicScope.hasScopedData) return buildActivityDays([], DASHBOARD_PACE_WINDOW_DAYS);
      const start = startOfDay(subDays(new Date(), DASHBOARD_PACE_WINDOW_DAYS - 1)).toISOString();
      const end = addDays(startOfDay(new Date()), 1).toISOString();

      const { data, error } = await supabase
        .from('topic_review_history')
        .select('topic_id, review_stage, reviewed_at')
        .eq('user_id', user.id)
        .in('topic_id', activeTopicScope.activeTopicIds)
        .gte('reviewed_at', start)
        .lt('reviewed_at', end)
        .order('reviewed_at', { ascending: true });

      if (error) throw error;
      return buildActivityDays(
        filterHistoryRowsByActiveTopicIds(
          (data || []) as unknown as DashboardActivityHistoryRow[],
          activeTopicScope.activeTopicIds,
        ),
        DASHBOARD_PACE_WINDOW_DAYS,
      );
    },
    enabled: Boolean(user?.id && hasActiveCycle),
    // Estudo e revisão acontecem em outras rotas. Reconciliar ao voltar evita
    // comparar a meta com uma janela recente ainda válida apenas no cache.
    refetchOnMount: 'always',
  });

  const addReminder = useMutation({
    mutationFn: async ({ text, reminderDate }: { text: string; reminderDate: string | null }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('general_reminders').insert({
        user_id: user.id,
        text,
        reminder_date: reminderDate,
        completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-reminders', user?.id] });
      toastManager.success('Lembrete criado');
    },
    onError: () => toastManager.error('Não consegui criar o lembrete agora'),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('general_reminders')
        .update({ completed, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-reminders', user?.id] });
    },
    onError: () => toastManager.error('Não consegui atualizar o lembrete agora'),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('general_reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-reminders', user?.id] });
      toastManager.success('Lembrete excluído definitivamente');
    },
    onError: () => toastManager.error('Não consegui excluir o lembrete agora'),
  });

  const updateCycleName = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Nome do ciclo obrigatório');

      const { error } = await supabase
        .from('user_cycles')
        .update({
          name: cleanName.slice(0, 160),
          atualizado_em: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
    },
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'cycle_name_updated' } }));
      toastManager.success('Nome do ciclo atualizado');
    },
    onError: () => toastManager.error('Não consegui atualizar o nome do ciclo agora'),
  });

  const pace = useMemo(
    () =>
      buildDashboardPace({
        examDate,
        totalUnstartedTopics: progressSummary.totalTopics - progressSummary.startedTopics,
        overdueReviews: overdueReviews.length,
        todayReviews: todayReviews.length,
        futureReviewsInWindow,
        hasActiveCycle,
      }),
    [examDate, futureReviewsInWindow, hasActiveCycle, overdueReviews.length, progressSummary.startedTopics, progressSummary.totalTopics, todayReviews.length],
  );

  const nextBestAction = useMemo(
    () =>
      buildNextBestAction({
        overdueReviews,
        todayReviews,
        cycleActions,
        strategicActions: [],
        hasActiveCycle,
      }),
    [cycleActions, hasActiveCycle, overdueReviews, todayReviews],
  );

  const actionQueue = useMemo(
    () =>
      buildActionQueue({
        overdueReviews,
        todayReviews,
        cycleActions,
        strategicActions: [],
        limit: 4,
      }).filter((action) => action.id !== nextBestAction.id),
    [cycleActions, nextBestAction.id, overdueReviews, todayReviews],
  );

  const daysRemaining = pace.daysRemaining;
  const editalIdentity = getDashboardEditalIdentity(activeEdital);
  const useCycleNameAsIdentity = Boolean(cycleDisplayName);
  const examState = !hasActiveCycle
    ? 'missing_cycle'
    : !examDate
      ? 'missing_exam_date'
      : typeof daysRemaining === 'number' && daysRemaining < 0
        ? 'exam_date_past'
        : 'ready';
  const studyEntryState = getStudyEmptyStateKind({
    editalCount: editaisData.length,
    editaisWithContentCount: editaisData.filter(edital => edital.subject_ids.length > 0).length,
    hasActiveCycle,
  });

  const criticalError = getDashboardCriticalError({
    reviewsError: reviewsData.error,
    cycleError: cycleData.error,
    editaisError,
  });

  const model: DashboardDecisionModel = {
    isLoading: reviewsData.isLoading || cycleData.isLoading || isEditaisLoading || isRemindersLoading || (hasActiveCycle && isActivityLoading),
    error: criticalError,
    dataIssues: getDashboardDataIssues({ activityError, remindersError }),
    studyEntryState,
    examContext: {
      editalName: cycleDisplayName || editalIdentity.editalName,
      position: useCycleNameAsIdentity ? null : editalIdentity.position,
      editalId: activeEdital?.id,
      examDate,
      daysRemaining,
      state: examState,
    },
    pace,
    nextBestAction,
    actionQueue,
    continueCycleItems: cycleActions,
    reminders,
    activityDays: hasActiveCycle ? activityDays : [],
    progressSummary,
    totals: {
      overdueReviews: overdueReviews.length,
      todayReviews: todayReviews.length,
      futureReviews: futureReviews.length,
      unstartedTopics: progressSummary.totalTopics - progressSummary.startedTopics,
      startedTopics: progressSummary.startedTopics,
      completedTopics: progressSummary.completedTopics,
      totalTopics: progressSummary.totalTopics,
    },
  };

  const navigateToAction: DashboardNavigate = (href, target) => {
    const destination = resolveDashboardNavigation(href, target, hasActiveCycle ? dashboardSubjects : []);
    if (destination.unavailable) {
      toastManager.error('Este tópico ou matéria não está mais no ciclo ativo. Confira a fila atual.');
      return;
    }
    navigate(destination.href, destination.state ? { state: destination.state } : undefined);
  };

  const retryDashboardDataIssue = async (source: DashboardDataIssueSource) => {
    if (source === 'activity') {
      await refetchActivity();
      return;
    }
    await refetchReminders();
  };

  return {
    model,
    addReminder: (text: string, reminderDate: string | null) => addReminder.mutateAsync({ text, reminderDate }),
    toggleReminder: (id: string, completed: boolean) => toggleReminder.mutateAsync({ id, completed }),
    deleteReminder: (id: string) => deleteReminder.mutateAsync(id),
    updateCycleName: (name: string) => updateCycleName.mutateAsync(name),
    isAddingReminder: addReminder.isPending,
    isUpdatingCycleName: updateCycleName.isPending,
    navigateToAction,
    retryDashboardDataIssue,
    isTogglingReminder: toggleReminder.isPending,
    isDeletingReminder: deleteReminder.isPending,
  };
};
