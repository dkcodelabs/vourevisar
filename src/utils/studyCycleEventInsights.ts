import {
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightPercentage,
  getExamWeightTotals,
  hasSubjectExamWeight,
} from '@/utils/examWeight';

type EventTopic = {
  id: string;
  is_active?: boolean;
  total_volume?: number | null;
  firstStudiedAt?: Date | string | null;
  first_studied_at?: string | null;
  reviewCount?: number;
  review_count?: number;
  reviewStage?: string | null;
  review_stage?: string | null;
  completed?: boolean;
  is_completed?: boolean;
};

type EventSubject = {
  id: string;
  name: string;
  topics: EventTopic[];
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
};

export type CycleStudyEvent = {
  id: string;
  event_type: string;
  subject_id: string | null;
  topic_id?: string | null;
  subject_position?: number | null;
  created_at: string;
};

export type StudyCycleEventInsightSeverity = 'warning' | 'info';

export type StudyCycleEventInsight = {
  id: string;
  severity: StudyCycleEventInsightSeverity;
  title: string;
  message: string;
  evidence: string;
  subjectId?: string;
};

type GetStudyCycleEventInsightsInput = {
  subjects: EventSubject[];
  events: CycleStudyEvent[];
  currentOrder: string[];
  overdueReviews?: number;
  minEvents?: number;
  maxInsights?: number;
};

const studyEventTypes = new Set([
  'topic_started',
  'topic_reviewed',
  'topic_continued',
  'subject_marked_studied',
]);

const activeTopics = (subject: EventSubject) =>
  subject.topics.filter(topic => topic.is_active !== false);

const isTopicStarted = (topic: EventTopic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  Boolean(topic.reviewStage) ||
  Boolean(topic.review_stage) ||
  topic.completed === true ||
  topic.is_completed === true;

const getStartedRatio = (subject: EventSubject) => {
  const topics = activeTopics(subject);
  if (topics.length === 0) return 0;
  return topics.filter(isTopicStarted).length / topics.length;
};

const subjectIncidenceVolume = (subject: EventSubject) =>
  activeTopics(subject).reduce((sum, topic) =>
    sum + (typeof topic.total_volume === 'number' && topic.total_volume > 0 ? topic.total_volume : 0),
  0);

const getSubjectPriorityEvidence = (
  subject: EventSubject,
  weightPercentage: number | null,
  volume: number,
) => {
  if (typeof weightPercentage === 'number' && Number.isFinite(weightPercentage)) {
    return `${weightPercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do edital pelos pesos conhecidos.`;
  }

  if (volume > 0) {
    return `Volume de cobrança ${volume.toLocaleString('pt-BR')}.`;
  }

  const effective = getEffectiveSubjectExamWeight(subject);
  return `${effective.value} ${effective.label}.`;
};

export const getStudyCycleEventInsights = ({
  subjects,
  events,
  currentOrder,
  overdueReviews = 0,
  minEvents = 5,
  maxInsights = 3,
}: GetStudyCycleEventInsightsInput): StudyCycleEventInsight[] => {
  const studyEvents = events.filter(event =>
    studyEventTypes.has(event.event_type) && Boolean(event.subject_id)
  );

  if (studyEvents.length < minEvents) return [];

  const insights: StudyCycleEventInsight[] = [];
  const eventCountsBySubject = new Map<string, number>();
  studyEvents.forEach(event => {
    if (!event.subject_id) return;
    eventCountsBySubject.set(event.subject_id, (eventCountsBySubject.get(event.subject_id) || 0) + 1);
  });

  const subjectsById = new Map(subjects.map(subject => [subject.id, subject]));
  const topStudied = Array.from(eventCountsBySubject.entries())
    .map(([subjectId, count]) => ({
      subject: subjectsById.get(subjectId),
      count,
      share: count / studyEvents.length,
    }))
    .filter((item): item is { subject: EventSubject; count: number; share: number } => Boolean(item.subject))
    .sort((a, b) => b.count - a.count)[0];

  const startedRatios = subjects
    .filter(subject => activeTopics(subject).length > 0)
    .map(subject => ({
      subject,
      startedRatio: getStartedRatio(subject),
    }));
  const averageStartedRatio = startedRatios.length
    ? startedRatios.reduce((sum, item) => sum + item.startedRatio, 0) / startedRatios.length
    : 0;
  const topStartedRatio = topStudied ? getStartedRatio(topStudied.subject) : 0;
  const concentrationLooksExcessive =
    topStartedRatio >= Math.min(0.75, averageStartedRatio + 0.35);

  if (topStudied && topStudied.share >= 0.6 && eventCountsBySubject.size >= 2 && concentrationLooksExcessive) {
    insights.push({
      id: `concentrated-study:${topStudied.subject.id}`,
      severity: 'warning',
      title: 'Concentração alta',
      message: `${topStudied.subject.name} concentrou ${Math.round(topStudied.share * 100)}% dos eventos recentes do ciclo.`,
      evidence: `${topStudied.count}/${studyEvents.length} eventos · ${Math.round(topStartedRatio * 100)}% dos tópicos da matéria iniciados.`,
      subjectId: topStudied.subject.id,
    });
  }

  const weightTotals = getExamWeightTotals(subjects);
  const prioritizedSubjects = subjects
    .map(subject => {
      const weightPercentage = getSubjectExamWeightPercentage(subject, weightTotals);
      const volume = subjectIncidenceVolume(subject);
      const effective = getEffectiveSubjectExamWeight(subject);
      const hasPrioritySignal = hasSubjectExamWeight(subject) || volume > 0;
      const eventCount = eventCountsBySubject.get(subject.id) || 0;
      const orderIndex = currentOrder.indexOf(subject.id);

      return {
        subject,
        eventCount,
        orderIndex,
        volume,
        weightPercentage,
        priorityValue: weightPercentage ?? (effective.source !== 'none' ? effective.value : volume),
        hasPrioritySignal,
      };
    })
    .filter(item => item.hasPrioritySignal && activeTopics(item.subject).length > 0)
    .sort((a, b) => b.priorityValue - a.priorityValue);

  const neglectedPriority = prioritizedSubjects.find(item => item.eventCount === 0);
  if (neglectedPriority) {
    insights.push({
      id: `priority-neglected:${neglectedPriority.subject.id}`,
      severity: 'warning',
      title: 'Matéria relevante sem evento',
      message: `${neglectedPriority.subject.name} tem sinal de prioridade, mas ainda não apareceu no uso recente do ciclo.`,
      evidence: getSubjectPriorityEvidence(
        neglectedPriority.subject,
        neglectedPriority.weightPercentage,
        neglectedPriority.volume,
      ),
      subjectId: neglectedPriority.subject.id,
    });
  }

  const latePriority = prioritizedSubjects.find(item =>
    item.orderIndex >= 0 &&
    currentOrder.length >= 4 &&
    item.orderIndex >= Math.ceil(currentOrder.length / 2) &&
    item.eventCount <= 1
  );

  if (latePriority && !insights.some(insight => insight.subjectId === latePriority.subject.id)) {
    insights.push({
      id: `priority-late-in-queue:${latePriority.subject.id}`,
      severity: 'info',
      title: 'Prioridade no fim da fila',
      message: `${latePriority.subject.name} tem sinal estratégico e está depois da metade da fila.`,
      evidence: `Posição ${latePriority.orderIndex + 1}/${currentOrder.length}.`,
      subjectId: latePriority.subject.id,
    });
  }

  const topicStartedCount = events.filter(event => event.event_type === 'topic_started').length;
  const topicReviewedCount = events.filter(event =>
    event.event_type === 'topic_reviewed' || event.event_type === 'topic_continued'
  ).length;
  const hasUnstartedTopics = subjects.some(subject => activeTopics(subject).length > 0);

  const reviewBacklogLikelyExplainsBehavior = overdueReviews >= Math.max(3, Math.ceil(topicReviewedCount * 0.6));

  if (
    hasUnstartedTopics &&
    !reviewBacklogLikelyExplainsBehavior &&
    topicReviewedCount >= Math.max(4, topicStartedCount * 2 + 1)
  ) {
    insights.push({
      id: 'many-reviews-few-new-topics',
      severity: 'info',
      title: 'Poucos tópicos novos',
      message: 'O uso recente tem muitas revisões de tópicos já abertos e poucos tópicos novos.',
      evidence: `${topicReviewedCount} revisões e ${topicStartedCount} tópicos novos registrados.`,
    });
  }

  return insights.slice(0, maxInsights);
};
