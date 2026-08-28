import { supabase } from '@/integrations/supabase/client';
import { mergeService } from '@/services/mergeService';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type {
  CycleStatisticsPeriod,
  CycleStatisticsSessionInput,
  CycleStatisticsSubjectInput,
  CycleStatisticsTopicInput,
} from '@/types/cycleStatistics';
import {
  buildReviewTopicMergesFromUnificationMap,
  dedupeMergedReviewTopics,
  expandReviewSubjectScope,
} from '@/utils/reviewMergeScope';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { determineLearningStatus } from '@/utils/learningStatus';
import { getCycleStatisticsQueryStart } from '@/utils/cycleStatistics';
import { getVisibleCycleTopics } from '@/utils/studyCycleTopicVisibility';

type CycleRow = {
  id: string;
  name: string | null;
  exam_date: string | null;
  data_inicio_ciclo: string | null;
  ciclo_atual: string[] | null;
  unification_map: unknown;
};

type SubjectRow = {
  id: string;
  name: string;
  color: string | null;
  edital_id: string | null;
  exam_weight_points: number | null;
  exam_weight_questions: number | null;
  exam_weight_percentage: number | null;
  exam_weight_raw: string | null;
};

type TopicRow = {
  id: string;
  name: string;
  subject_id: string;
  edital_id: string | null;
  completed: boolean;
  review_count: number;
  review_stage: string | null;
  next_review: string | null;
  first_studied_at: string | null;
  last_reviewed_at: string | null;
  memory_stability: number | null;
  current_interval: number | null;
  is_active: boolean | null;
  is_hidden: boolean | null;
};

type SessionRow = {
  id: string;
  subject_id: string | null;
  study_date: string;
  session_duration_minutes: number | null;
};

type EditalRow = {
  id: string;
  name: string;
  subject_ids: string[];
};

export type CycleStatisticsSource = {
  cycle: {
    id: string;
    name: string | null;
    examDate: string | null;
    startedAt: string | null;
  } | null;
  editalNames: string[];
  topics: CycleStatisticsTopicInput[];
  subjects: CycleStatisticsSubjectInput[];
  sessions: CycleStatisticsSessionInput[];
};

type SubjectPresentationGroup = CycleStatisticsSubjectInput & {
  order: number;
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const parseUnificationMap = (value: unknown): CycleUnificationMap | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CycleUnificationMap>;
  return candidate.version === 1 && Array.isArray(candidate.unifiedSubjects)
    ? candidate as CycleUnificationMap
    : null;
};

const getSubjectGroupBuilder = (
  cycleSubjectIds: string[],
  subjects: SubjectRow[],
  subjectMerges: Awaited<ReturnType<typeof mergeService.getActiveSubjectMerges>>,
  unificationMap: CycleUnificationMap | null,
) => {
  const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
  const groupIdBySubjectId = new Map<string, string>();
  const groups: SubjectPresentationGroup[] = [];

  const registerGroup = (params: {
    id: string;
    name: string;
    sourceIds: string[];
    order: number;
  }) => {
    const sourceIds = unique(params.sourceIds);
    if (sourceIds.length === 0 || sourceIds.every(id => groupIdBySubjectId.has(id))) return;
    const preferred = subjectById.get(params.id)
      ?? sourceIds.map(id => subjectById.get(id)).find(Boolean);
    if (!preferred) return;

    sourceIds.forEach(id => groupIdBySubjectId.set(id, params.id));
    groups.push({
      id: params.id,
      name: params.name || preferred.name,
      color: preferred.color,
      sourceSubjectIds: sourceIds,
      examWeightPoints: preferred.exam_weight_points,
      examWeightQuestions: preferred.exam_weight_questions,
      examWeightPercentage: preferred.exam_weight_percentage,
      examWeightRaw: preferred.exam_weight_raw,
      order: params.order,
    });
  };

  subjectMerges.forEach(merge => {
    const sourceIds = unique([merge.primary_subject_id, ...(merge.merged_subject_ids || [])]);
    const firstCycleIndex = cycleSubjectIds.findIndex(id => sourceIds.includes(id));
    if (firstCycleIndex < 0) return;
    registerGroup({
      id: merge.primary_subject_id,
      name: merge.display_name,
      sourceIds,
      order: firstCycleIndex,
    });
  });

  (unificationMap?.unifiedSubjects ?? []).forEach(unified => {
    const firstCycleIndex = cycleSubjectIds.findIndex(id => unified.originalSubjectIds.includes(id));
    if (firstCycleIndex < 0) return;
    registerGroup({
      id: unified.originalSubjectIds[0],
      name: unified.displayNameOverride || unified.displayName,
      sourceIds: unified.originalSubjectIds,
      order: firstCycleIndex,
    });
  });

  cycleSubjectIds.forEach((subjectId, order) => {
    if (groupIdBySubjectId.has(subjectId)) return;
    const subject = subjectById.get(subjectId);
    if (!subject) return;
    registerGroup({ id: subject.id, name: subject.name, sourceIds: [subject.id], order });
  });

  subjects.forEach((subject, index) => {
    if (groupIdBySubjectId.has(subject.id)) return;
    registerGroup({
      id: subject.id,
      name: subject.name,
      sourceIds: [subject.id],
      order: cycleSubjectIds.length + index,
    });
  });

  return {
    groupIdBySubjectId,
    groups: groups.sort((left, right) => left.order - right.order),
  };
};

async function fetchSessions(params: {
  userId: string;
  cycleId: string;
  startDate: string | null;
}): Promise<SessionRow[]> {
  const pageSize = 1000;
  const sessions: SessionRow[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from('study_sessions')
      .select('id, subject_id, study_date, session_duration_minutes')
      .eq('user_id', params.userId)
      .eq('cycle_id', params.cycleId)
      .order('study_date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (params.startDate) query = query.gte('study_date', params.startDate);
    const { data, error } = await query;

    if (error) throw error;
    const page = (data ?? []) as SessionRow[];
    sessions.push(...page);
    if (page.length < pageSize) break;
  }

  return sessions;
}

export async function fetchCycleStatisticsSource(params: {
  userId: string;
  period: CycleStatisticsPeriod;
  now?: Date;
}): Promise<CycleStatisticsSource> {
  const { data: cycleData, error: cycleError } = await supabase
    .from('user_cycles')
    .select('id, name, exam_date, data_inicio_ciclo, ciclo_atual, unification_map')
    .eq('user_id', params.userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (cycleError) throw cycleError;
  if (!cycleData || !Array.isArray(cycleData.ciclo_atual) || cycleData.ciclo_atual.length === 0) {
    return { cycle: null, editalNames: [], topics: [], subjects: [], sessions: [] };
  }

  const cycle = cycleData as CycleRow;
  const cycleSubjectIds = unique(cycle.ciclo_atual ?? []);
  const unificationMap = parseUnificationMap(cycle.unification_map);
  const [subjectMerges, topicMerges] = await Promise.all([
    mergeService.getActiveSubjectMerges(params.userId),
    mergeService.getActiveTopicMerges(params.userId),
  ]);
  const subjectScopeIds = expandReviewSubjectScope(cycleSubjectIds, subjectMerges, unificationMap);
  const queryStart = getCycleStatisticsQueryStart(params.period, params.now);

  const [subjectsResult, topicsResult, editaisResult, sessions] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, name, color, edital_id, exam_weight_points, exam_weight_questions, exam_weight_percentage, exam_weight_raw')
      .eq('user_id', params.userId)
      .in('id', subjectScopeIds),
    supabase
      .from('topics')
      .select(`
        id,
        name,
        subject_id,
        edital_id,
        completed,
        review_count,
        review_stage,
        next_review,
        first_studied_at,
        last_reviewed_at,
        memory_stability,
        current_interval,
        is_active,
        is_hidden,
        subjects!inner(user_id)
      `)
      .eq('subjects.user_id', params.userId)
      .in('subject_id', subjectScopeIds),
    supabase
      .from('user_editais')
      .select('id, name, subject_ids')
      .eq('user_id', params.userId),
    fetchSessions({ userId: params.userId, cycleId: cycle.id, startDate: queryStart }),
  ]);

  if (subjectsResult.error) throw subjectsResult.error;
  if (topicsResult.error) throw topicsResult.error;
  if (editaisResult.error) throw editaisResult.error;

  const subjectRows = (subjectsResult.data ?? []) as SubjectRow[];
  const { groupIdBySubjectId, groups } = getSubjectGroupBuilder(
    cycleSubjectIds,
    subjectRows,
    subjectMerges,
    unificationMap,
  );
  const visibleTopics = getVisibleCycleTopics((topicsResult.data ?? []) as unknown as TopicRow[]);
  const reviewScopeTopics = visibleTopics.map(topic => ({
    ...topic,
    source_topic_ids: [topic.id],
    source_edital_ids: topic.edital_id ? [topic.edital_id] : [],
  }));
  const dedupedTopics = dedupeMergedReviewTopics(reviewScopeTopics, [
    ...buildReviewTopicMergesFromUnificationMap(unificationMap, reviewScopeTopics),
    ...topicMerges,
  ]);
  const topics: CycleStatisticsTopicInput[] = dedupedTopics.map(topic => {
    const completed = isReviewProgramCompleted(topic);
    const reviewCount = topic.review_count ?? 0;
    return {
      id: topic.id,
      name: topic.name,
      subjectId: groupIdBySubjectId.get(topic.subject_id) ?? topic.subject_id,
      sourceTopicIds: topic.source_topic_ids ?? [topic.id],
      completed,
      reviewCount,
      reviewStage: topic.review_stage ?? null,
      nextReview: topic.next_review ?? null,
      firstStudiedAt: topic.first_studied_at ?? null,
      lastReviewedAt: topic.last_reviewed_at ?? null,
      memoryStability: topic.memory_stability ?? null,
      currentInterval: topic.current_interval ?? null,
      learningStatus: completed
        ? 'Dominando'
        : (topic.first_studied_at || reviewCount > 0)
          ? determineLearningStatus(topic.memory_stability ?? 0, topic.current_interval ?? 0, reviewCount)
          : undefined,
    };
  });

  const editalIdsFromMap = new Set(unificationMap?.editalIds ?? []);
  const subjectScopeSet = new Set(subjectScopeIds);
  const editalNames = ((editaisResult.data ?? []) as EditalRow[])
    .filter(edital => editalIdsFromMap.has(edital.id) || edital.subject_ids.some(id => subjectScopeSet.has(id)))
    .map(edital => edital.name);

  return {
    cycle: {
      id: cycle.id,
      name: cycle.name,
      examDate: cycle.exam_date,
      startedAt: cycle.data_inicio_ciclo,
    },
    editalNames: unique(editalNames),
    topics,
    subjects: groups.map(({ order: _order, ...group }) => group),
    sessions: sessions.map(session => ({
      id: session.id,
      subjectId: session.subject_id ? (groupIdBySubjectId.get(session.subject_id) ?? session.subject_id) : null,
      studyDate: session.study_date,
      durationMinutes: Math.max(0, Number(session.session_duration_minutes ?? 0)),
    })),
  };
}
