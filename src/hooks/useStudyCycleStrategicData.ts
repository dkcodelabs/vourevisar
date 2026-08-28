import { useMemo } from 'react';

import type { Subject, UserCycle } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import {
  getExamWeightTotals,
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightPercentage,
} from '@/utils/examWeight';
import { getStudyCycleAlerts } from '@/utils/studyCycleAlerts';
import { getStudyCycleEventInsights, type CycleStudyEvent } from '@/utils/studyCycleEventInsights';
import { getStudyCycleMetrics } from '@/utils/studyCycleMetrics';
import { getStudyCycleQueueSuggestion } from '@/utils/studyCycleQueueSuggestion';
import {
  getVisibleCycleTopics,
  isVisibleCycleTopic,
} from '@/utils/studyCycleTopicVisibility';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { getStudyCycleTransitionSummary } from '@/utils/studyCycleTransitionSummary';
import { getUnifiedSubjectId } from '@/services/cycleMergeService';

type ExpandedSubjectItem = {
  id: string;
  subject: Subject;
};

type StudyCycleMaturityPhase = 'cold_start' | 'started' | 'active' | 'historical';

type StudyCycleStrategicEdital = {
  id: string;
  name: string;
  subject_ids?: string[];
  organ?: string;
  exam_date?: string | null;
};

type CycleRotationSnapshotLike = {
  id?: string;
};

type UseStudyCycleStrategicDataInput = {
  cycleClosedSubjectIdSet: Set<string>;
  cycleSnapshots: CycleRotationSnapshotLike[];
  cycleStudyEvents: CycleStudyEvent[];
  dynamicUnificationMap: CycleUnificationMap;
  editaisNoCiclo: StudyCycleStrategicEdital[];
  expandedSubjectList: ExpandedSubjectItem[];
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  topicStudyMinutes: Map<string, number>;
  userCycle: UserCycle | null;
};

const getTopicFirstStudyDate = (topic: Subject['topics'][number]): string | Date | null | undefined =>
  topic.first_studied_at || topic.firstStudiedAt;

const isTopicCompleted = (topic: Subject['topics'][number]) =>
  isReviewProgramCompleted(topic);

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const isTopicStarted = (topic: Subject['topics'][number]) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  Boolean(topic.nextReview) ||
  Boolean(topic.next_review) ||
  isTopicCompleted(topic);

const isTopicNewlyStartedInCycle = (
  topic: Subject['topics'][number],
  cycleStart?: string | null,
): boolean => {
  if (!cycleStart) return false;

  const firstStudiedAt = getTopicFirstStudyDate(topic);
  if (!firstStudiedAt) return false;

  const firstStudiedTime = new Date(firstStudiedAt).getTime();
  const cycleStartTime = new Date(cycleStart).getTime();

  return Number.isFinite(firstStudiedTime) &&
    Number.isFinite(cycleStartTime) &&
    firstStudiedTime >= cycleStartTime;
};

const getSubjectPendingTopicsCount = (subject: Subject) =>
  subject.topics.filter(topic => isVisibleCycleTopic(topic) && !isTopicStarted(topic)).length;

export function useStudyCycleStrategicData({
  cycleClosedSubjectIdSet,
  cycleSnapshots,
  cycleStudyEvents,
  dynamicUnificationMap,
  editaisNoCiclo,
  expandedSubjectList,
  getUnifiedSubjectName,
  topicStudyMinutes,
  userCycle,
}: UseStudyCycleStrategicDataInput) {
  const cycleVisualStats = useMemo(() => {
    const cycleSubjects = expandedSubjectList.map(item => item.subject);
    const totalSubjects = cycleSubjects.length;
    const studiedSubjects = cycleSubjects.filter(subject => cycleClosedSubjectIdSet.has(subject.id)).length;
    const remainingSubjects = Math.max(totalSubjects - studiedSubjects, 0);
    const progressPercentage = totalSubjects > 0 ? Math.round((studiedSubjects / totalSubjects) * 100) : 0;
    const parsedCycleStartMs = userCycle?.data_inicio_ciclo ? new Date(userCycle.data_inicio_ciclo).getTime() : NaN;
    const cycleStartMs = Number.isFinite(parsedCycleStartMs) ? parsedCycleStartMs : Date.now();
    const elapsedDays = Math.max(
      1,
      Math.ceil((Date.now() - cycleStartMs) / (1000 * 60 * 60 * 24))
    );
    const subjectsPerDay = studiedSubjects > 0 ? studiedSubjects / elapsedDays : 0;
    const daysToFinish = subjectsPerDay > 0 ? Math.ceil(remainingSubjects / subjectsPerDay) : null;

    return {
      totalSubjects,
      studiedSubjects,
      remainingSubjects,
      progressPercentage,
      elapsedDays,
      subjectsPerDay,
      daysToFinish,
    };
  }, [expandedSubjectList, cycleClosedSubjectIdSet, userCycle?.data_inicio_ciclo]);

  const strategicPanelStats = useMemo(() => {
    const cycleSubjects = expandedSubjectList.map(item => item.subject);
    const cycleStart = userCycle?.data_inicio_ciclo || null;
    const totalSubjects = cycleSubjects.length;
    const totalTopics = cycleSubjects.reduce(
      (sum, subject) => sum + getVisibleCycleTopics(subject.topics).length,
      0,
    );
    const startedTopics = cycleSubjects.reduce(
      (sum, subject) => sum + subject.topics.filter(topic => isVisibleCycleTopic(topic) && isTopicStarted(topic)).length,
      0,
    );
    const completedTopics = cycleSubjects.reduce(
      (sum, subject) => sum + subject.topics.filter(topic => isVisibleCycleTopic(topic) && isTopicCompleted(topic)).length,
      0,
    );
    const coveragePercentage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;
    const completedSubjects = cycleSubjects.filter(subject => {
      const activeTopics = getVisibleCycleTopics(subject.topics);
      return activeTopics.length > 0 && activeTopics.every(isTopicCompleted);
    }).length;
    const inProgressSubjects = cycleSubjects.filter(subject =>
      subject.topics.some(topic => isVisibleCycleTopic(topic) && isTopicStarted(topic) && !isTopicCompleted(topic))
    ).length;
    const topicsStartedThisCycle = cycleSubjects.reduce(
      (sum, subject) => sum + subject.topics.filter(topic =>
        isVisibleCycleTopic(topic) && isTopicNewlyStartedInCycle(topic, cycleStart)
      ).length,
      0,
    );
    const examWeightTotals = getExamWeightTotals(cycleSubjects);
    const highestIncidenceTopic = cycleSubjects.flatMap(subject =>
      subject.topics
        .filter(topic => isVisibleCycleTopic(topic) && typeof topic.total_volume === 'number' && topic.total_volume > 0)
        .map(topic => ({
          topicName: topic.name,
          subjectName: getUnifiedSubjectName(subject.id, subject.name),
          volume: topic.total_volume || 0,
        }))
    ).reduce<{
      topicName: string;
      subjectName: string;
      volume: number;
    } | null>((best, topic) => {
      if (!best || topic.volume > best.volume) return topic;
      return best;
    }, null);
    const highestIncidenceSubject = cycleSubjects.map(subject => {
      const analyzedTopics = subject.topics.filter(topic =>
        isVisibleCycleTopic(topic) && typeof topic.total_volume === 'number' && topic.total_volume > 0
      );
      const totalVolume = analyzedTopics.reduce((sum, topic) => sum + (topic.total_volume || 0), 0);

      return {
        subjectName: getUnifiedSubjectName(subject.id, subject.name),
        totalVolume,
        analyzedTopicsCount: analyzedTopics.length,
      };
    }).filter(item => item.totalVolume > 0)
      .reduce<{
        subjectName: string;
        totalVolume: number;
        analyzedTopicsCount: number;
      } | null>((best, subject) => {
        if (!best || subject.totalVolume > best.totalVolume) return subject;
        return best;
      }, null);
    const highestPendingWeightSubject = cycleSubjects
      .filter(subject => getSubjectPendingTopicsCount(subject) > 0)
      .map(subject => ({
        subject,
        effectiveWeight: getEffectiveSubjectExamWeight(subject),
        percentage: getSubjectExamWeightPercentage(subject, examWeightTotals),
      }))
      .filter(item => item.effectiveWeight.source !== 'none')
      .reduce<{
        subject: Subject;
        effectiveWeight: ReturnType<typeof getEffectiveSubjectExamWeight>;
        percentage: number | null;
      } | null>((best, item) => {
        if (!best || item.effectiveWeight.value > best.effectiveWeight.value) return item;
        return best;
      }, null);

    return {
      totalSubjects,
      totalTopics,
      coveragePercentage,
      startedSubjectsCount: inProgressSubjects + completedSubjects,
      highestIncidenceTopic,
      highestIncidenceSubject,
      highestPendingWeightSubject,
    };
  }, [expandedSubjectList, getUnifiedSubjectName, userCycle?.data_inicio_ciclo]);

  const cycleTransitionSummary = useMemo(() => getStudyCycleTransitionSummary({
    subjects: expandedSubjectList.map(item => ({
      id: item.subject.id,
      name: getUnifiedSubjectName(item.subject.id, item.subject.name),
      topics: item.subject.topics,
    })),
    studyMinutesByTopicId: topicStudyMinutes,
  }), [expandedSubjectList, getUnifiedSubjectName, topicStudyMinutes]);

  const cycleMaturity = useMemo(() => {
    const cycleNumber = (userCycle?.ciclos_realizados || 0) + 1;
    const eventCount = cycleStudyEvents.filter(event =>
      ['topic_started', 'topic_reviewed', 'topic_continued', 'subject_marked_studied', 'cycle_reordered'].includes(event.event_type)
    ).length;
    const hasSavedCycleHistory = cycleSnapshots.length > 0;
    const hasLegacyCycleHistory = cycleNumber > 1;
    const hasAnyStartedTopic = strategicPanelStats.startedTopics > 0 || strategicPanelStats.topicsStartedThisCycle > 0;
    const hasActiveUse =
      eventCount >= 8 ||
      strategicPanelStats.topicsStartedThisCycle >= 5 ||
      cycleVisualStats.studiedSubjects >= 2 ||
      strategicPanelStats.coveragePercentage >= 10;

    let phase: StudyCycleMaturityPhase = 'cold_start';
    if (hasSavedCycleHistory || (hasLegacyCycleHistory && (eventCount >= 4 || hasAnyStartedTopic))) {
      phase = 'historical';
    } else if (hasActiveUse) {
      phase = 'active';
    } else if (hasAnyStartedTopic || cycleVisualStats.studiedSubjects > 0) {
      phase = 'started';
    }

    const labelByPhase: Record<StudyCycleMaturityPhase, string> = {
      cold_start: 'Início do ciclo',
      started: 'Primeiros sinais',
      active: 'Uso ativo',
      historical: hasSavedCycleHistory ? 'Histórico disponível' : 'Histórico parcial',
    };

    const descriptionByPhase: Record<StudyCycleMaturityPhase, string> = {
      cold_start: 'Comece alguns tópicos para o sistema detectar padrões sem forçar alerta cedo demais.',
      started: 'Já existe primeiro contato. Os próximos sinais aparecem conforme você avança na fila.',
      active: 'Já há uso suficiente para cruzar ritmo, cobertura, peso e cobrança com mais segurança.',
      historical: hasSavedCycleHistory
        ? 'Já há ciclo salvo para comparação e leitura de evolução.'
        : `Você está no ciclo ${cycleNumber}, mas o histórico detalhado começou a ser salvo agora.`,
    };

    return {
      phase,
      label: labelByPhase[phase],
      description: descriptionByPhase[phase],
      eventCount,
      cycleNumber,
      hasSavedCycleHistory,
    };
  }, [
    cycleSnapshots.length,
    cycleStudyEvents,
    cycleVisualStats.studiedSubjects,
    strategicPanelStats.coveragePercentage,
    strategicPanelStats.startedTopics,
    strategicPanelStats.topicsStartedThisCycle,
    userCycle?.ciclos_realizados,
  ]);

  const strategicAlerts = useMemo(() => {
    const cycleSubjects = expandedSubjectList.map(item => ({
      ...item.subject,
      name: getUnifiedSubjectName(item.subject.id, item.subject.name),
    }));

    const alerts = getStudyCycleAlerts({
      subjects: cycleSubjects,
      cycleExamDate: userCycle?.exam_date || null,
      editais: editaisNoCiclo.map(edital => ({
        id: edital.id,
        name: edital.organ || edital.name || 'Edital',
        exam_date: edital.exam_date || null,
        subject_ids: edital.subject_ids || [],
      })),
      hasCycleHistory: cycleSnapshots.length > 0,
      maxAlerts: 5,
    });

    if (cycleMaturity.phase === 'cold_start') return [];
    if (cycleMaturity.phase === 'started') {
      return alerts.filter(alert => alert.severity === 'critical').slice(0, 3);
    }

    return alerts;
  }, [cycleMaturity.phase, cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, getUnifiedSubjectName, userCycle?.exam_date]);

  const cycleMetrics = useMemo(() => {
    return getStudyCycleMetrics({
      subjects: expandedSubjectList.map(item => item.subject),
      cycleExamDate: userCycle?.exam_date || null,
      editais: editaisNoCiclo.map(edital => ({
        exam_date: edital.exam_date || null,
      })),
      cycleStart: userCycle?.data_inicio_ciclo || null,
      hasCycleHistory: cycleSnapshots.length > 0,
    });
  }, [cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, userCycle?.data_inicio_ciclo, userCycle?.exam_date]);

  const cycleEventInsights = useMemo(() => {
    const currentOrder = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );

    return getStudyCycleEventInsights({
      subjects: expandedSubjectList.map(item => ({
        ...item.subject,
        name: getUnifiedSubjectName(item.subject.id, item.subject.name),
      })),
      events: cycleStudyEvents,
      currentOrder,
      overdueReviews: cycleMetrics.overdueReviews,
      minEvents: cycleMaturity.phase === 'historical' ? 4 : 5,
      maxInsights: 3,
    });
  }, [cycleMaturity.phase, cycleMetrics.overdueReviews, cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

  const queueSuggestion = useMemo(() => {
    if (!['active', 'historical'].includes(cycleMaturity.phase)) return null;

    const currentOrder = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );

    return getStudyCycleQueueSuggestion({
      subjects: expandedSubjectList.map(item => ({
        ...item.subject,
        name: getUnifiedSubjectName(item.subject.id, item.subject.name),
      })),
      events: cycleStudyEvents,
      currentOrder,
      minEvents: 6,
    });
  }, [cycleMaturity.phase, cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

  return {
    cycleEventInsights,
    cycleMaturity,
    cycleMetrics,
    cycleTransitionSummary,
    cycleVisualStats,
    queueSuggestion,
    strategicAlerts,
    strategicPanelStats,
  };
}
