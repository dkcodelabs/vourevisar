import {
  getExamWeightTotals,
  getSubjectExamWeightPercentage,
  hasSubjectExamWeight,
} from '@/utils/examWeight';

type QueueTopic = {
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

type QueueSubject = {
  id: string;
  name: string;
  topics: QueueTopic[];
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
};

type QueueEvent = {
  event_type: string;
  subject_id: string | null;
};

export type StudyCycleQueueSuggestion = {
  suggestedOrder: string[];
  movedSubjectIds: string[];
  title: string;
  message: string;
  evidence: string;
  limitations: string[];
};

type GetStudyCycleQueueSuggestionInput = {
  subjects: QueueSubject[];
  events: QueueEvent[];
  currentOrder: string[];
  minEvents?: number;
};

const activeTopics = (subject: QueueSubject) =>
  subject.topics.filter(topic => topic.is_active !== false);

const isTopicCompleted = (topic: QueueTopic) =>
  topic.completed === true ||
  topic.is_completed === true ||
  topic.reviewStage === 'Concluído' ||
  topic.review_stage === 'Concluído';

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const isTopicStarted = (topic: QueueTopic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  isTopicCompleted(topic);

const subjectIncidenceVolume = (subject: QueueSubject) =>
  activeTopics(subject).reduce((sum, topic) =>
    sum + (typeof topic.total_volume === 'number' && topic.total_volume > 0 ? topic.total_volume : 0),
  0);

const getStartedRatio = (subject: QueueSubject) => {
  const topics = activeTopics(subject);
  if (topics.length === 0) return 1;
  return topics.filter(isTopicStarted).length / topics.length;
};

const hasUnstartedActiveTopics = (subject: QueueSubject) =>
  activeTopics(subject).some(topic => !isTopicStarted(topic));

const getStudyEventsBySubject = (events: QueueEvent[]) => {
  const counts = new Map<string, number>();
  events.forEach(event => {
    if (!event.subject_id) return;
    if (!['topic_started', 'topic_reviewed', 'topic_continued', 'subject_marked_studied'].includes(event.event_type)) return;
    counts.set(event.subject_id, (counts.get(event.subject_id) || 0) + 1);
  });
  return counts;
};

export const getStudyCycleQueueSuggestion = ({
  subjects,
  events,
  currentOrder,
  minEvents = 6,
}: GetStudyCycleQueueSuggestionInput): StudyCycleQueueSuggestion | null => {
  const orderedSubjects = currentOrder
    .map(subjectId => subjects.find(subject => subject.id === subjectId))
    .filter((subject): subject is QueueSubject => Boolean(subject));

  if (orderedSubjects.length < 4 || events.length < minEvents) return null;

  const activeSubjects = orderedSubjects.filter(subject =>
    activeTopics(subject).length > 0 &&
    hasUnstartedActiveTopics(subject)
  );
  if (activeSubjects.length < 4) return null;

  const weightTotals = getExamWeightTotals(activeSubjects);
  const weightedSubjectsCount = activeSubjects.filter(hasSubjectExamWeight).length;
  const canCompareWeight = weightedSubjectsCount >= 2;
  const maxIncidence = Math.max(...activeSubjects.map(subjectIncidenceVolume), 0);
  const incidenceSubjectsCount = activeSubjects.filter(subject => subjectIncidenceVolume(subject) > 0).length;
  const canCompareIncidence = incidenceSubjectsCount >= 2;

  if (!canCompareWeight && !canCompareIncidence) return null;

  const studyEventsBySubject = getStudyEventsBySubject(events);
  const maxEventCount = Math.max(...activeSubjects.map(subject => studyEventsBySubject.get(subject.id) || 0), 1);

  const ranked = activeSubjects
    .map((subject, index) => {
      const weightPercentage = canCompareWeight
        ? getSubjectExamWeightPercentage(subject, weightTotals)
        : null;
      const incidenceVolume = subjectIncidenceVolume(subject);
      const incidenceScore = canCompareIncidence && maxIncidence > 0 ? incidenceVolume / maxIncidence : 0;
      const weightScore = typeof weightPercentage === 'number' ? Math.min(weightPercentage / 30, 1) : 0;
      const startedRatio = getStartedRatio(subject);
      const eventCount = studyEventsBySubject.get(subject.id) || 0;
      const usageScore = eventCount / maxEventCount;
      const needsAttention = 1 - Math.min(startedRatio, usageScore);
      const priorityScore = (weightScore * 0.55) + (incidenceScore * 0.35) + (needsAttention * 0.10);

      return {
        subject,
        index,
        weightPercentage,
        incidenceVolume,
        startedRatio,
        eventCount,
        priorityScore,
        hasComparableSignal: weightScore > 0 || incidenceScore > 0,
      };
    })
    .filter(item => item.hasComparableSignal)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.index - b.index);

  const top = ranked[0];
  if (!top) return null;

  const topCurrentIndex = currentOrder.indexOf(top.subject.id);
  const targetIndex = 0;
  if (topCurrentIndex <= targetIndex || top.priorityScore < 0.35) return null;

  const nextOrder = currentOrder.filter(subjectId => subjectId !== top.subject.id);
  nextOrder.splice(targetIndex, 0, top.subject.id);

  const movedSubjectIds = currentOrder.filter((subjectId, index) => nextOrder[index] !== subjectId);
  if (movedSubjectIds.length === 0) return null;

  const limitations: string[] = [];
  if (!canCompareWeight && weightedSubjectsCount === 1) {
    limitations.push('Só uma matéria tem peso conhecido; a sugestão não usa peso como ranking geral.');
  }
  if (!canCompareIncidence && incidenceSubjectsCount === 1) {
    limitations.push('Só uma matéria tem incidência analisada; a sugestão não usa incidência como ranking geral.');
  }

  const evidenceParts = [
    top.weightPercentage !== null
      ? `${top.weightPercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% entre os pesos informados`
      : null,
    top.incidenceVolume > 0
      ? `maior cobrança analisada na fila`
      : null,
    `${Math.round(top.startedRatio * 100)}% dos tópicos iniciados`,
  ].filter(Boolean);

  return {
    suggestedOrder: nextOrder,
    movedSubjectIds,
    title: 'Sugestão de fila',
    message: `${top.subject.name} parece merecer uma posição mais alta na fila atual.`,
    evidence: evidenceParts.join(' · '),
    limitations,
  };
};
