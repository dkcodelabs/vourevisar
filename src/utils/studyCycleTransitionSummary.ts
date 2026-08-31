import { isReviewProgramCompleted } from '@/utils/reviewStage';

export type StudyCycleTransitionTopic = {
  id: string;
  first_studied_at?: string | Date | null;
  firstStudiedAt?: string | Date | null;
  next_review?: string | Date | null;
  nextReview?: string | Date | null;
  completed?: boolean | null;
  is_completed?: boolean | null;
  reviewCount?: number | null;
  review_count?: number | null;
  reviewStage?: string | null;
  review_stage?: string | null;
  is_active?: boolean | null;
  is_hidden?: boolean | null;
};

export type StudyCycleTransitionSubject = {
  id: string;
  name: string;
  topics: StudyCycleTransitionTopic[];
};

export type StudyCycleTransitionActionKind =
  | 'overdue_reviews'
  | 'today_reviews'
  | 'future_reviews'
  | 'unscheduled_reviews'
  | 'edital_completed'
  | 'continue_cycle';

export type StudyCycleSubjectMinutes = {
  subjectId: string;
  subjectName: string;
  minutes: number;
};

export type StudyCycleTransitionSummary = {
  totalSubjects: number;
  firstContactClosedSubjects: number;
  completedSubjects: number;
  totalTopics: number;
  startedTopics: number;
  unstartedTopics: number;
  completedTopics: number;
  hasNoNewTopicsToStart: boolean;
  isEditalCompleted: boolean;
  reviewCounts: {
    overdue: number;
    today: number;
    future: number;
    unscheduled: number;
  };
  totalStudyMinutes: number;
  averageMinutesPerStartedTopic: number | null;
  topSubjectByStudyMinutes: StudyCycleSubjectMinutes | null;
  lowestSubjectByStudyMinutes: StudyCycleSubjectMinutes | null;
  primaryAction: {
    kind: StudyCycleTransitionActionKind;
    label: string;
    description: string;
    to: string;
  };
};

type GetStudyCycleTransitionSummaryInput = {
  subjects: StudyCycleTransitionSubject[];
  studyMinutesByTopicId?: Map<string, number>;
  now?: Date;
};

const startOfLocalDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const asDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isVisibleTopic = (topic: StudyCycleTransitionTopic) =>
  topic.is_active !== false && topic.is_hidden !== true;

const isTopicCompleted = (topic: StudyCycleTransitionTopic) =>
  isReviewProgramCompleted(topic);

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const getFirstStudiedAt = (topic: StudyCycleTransitionTopic) =>
  topic.first_studied_at || topic.firstStudiedAt || null;

const getNextReviewAt = (topic: StudyCycleTransitionTopic) =>
  topic.next_review || topic.nextReview || null;

const isTopicStarted = (topic: StudyCycleTransitionTopic) =>
  Boolean(getFirstStudiedAt(topic)) ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  isTopicCompleted(topic);

const getPrimaryAction = (
  reviewCounts: StudyCycleTransitionSummary['reviewCounts'],
  isEditalCompleted: boolean,
  hasNoNewTopicsToStart: boolean,
): StudyCycleTransitionSummary['primaryAction'] => {
  if (isEditalCompleted) {
    return {
      kind: 'edital_completed',
      label: 'Ver desempenho',
      description: 'Todos os tópicos ativos terminaram o programa de revisão.',
      to: '/estatisticas',
    };
  }

  if (!hasNoNewTopicsToStart) {
    return {
      kind: 'continue_cycle',
      label: 'Continuar ciclo',
      description: 'Ainda existem tópicos sem primeiro contato.',
      to: '/ciclo-estudos',
    };
  }

  if (reviewCounts.overdue > 0) {
    return {
      kind: 'overdue_reviews',
      label: 'Revisar atrasadas',
      description: 'Todos os tópicos já foram iniciados. O maior risco agora são revisões vencidas.',
      to: '/revisoes?tab=atrasadas',
    };
  }

  if (reviewCounts.today > 0) {
    return {
      kind: 'today_reviews',
      label: 'Revisar hoje',
      description: 'O edital já foi todo iniciado. Hoje sua prioridade é consolidar os tópicos programados.',
      to: '/revisoes?tab=hoje',
    };
  }

  if (reviewCounts.future > 0) {
    return {
      kind: 'future_reviews',
      label: 'Ver próximas revisões',
      description: 'Não há tópico novo para iniciar agora. Suas próximas ações estão no calendário de revisões.',
      to: '/revisoes?tab=futuras',
    };
  }

  return {
    kind: 'unscheduled_reviews',
    label: 'Verificar revisões',
    description: 'Há tópicos iniciados sem próxima revisão. Isso é agenda inconsistente, não ciclo concluído.',
    to: '/revisoes',
  };
};

export const getStudyCycleTransitionSummary = ({
  subjects,
  studyMinutesByTopicId = new Map(),
  now = new Date(),
}: GetStudyCycleTransitionSummaryInput): StudyCycleTransitionSummary => {
  const today = startOfLocalDay(now);
  const visibleSubjects = subjects
    .map(subject => ({
      ...subject,
      topics: subject.topics.filter(isVisibleTopic),
    }))
    .filter(subject => subject.topics.length > 0);
  const allTopics = visibleSubjects.flatMap(subject => subject.topics);
  const startedTopics = allTopics.filter(isTopicStarted);
  const completedTopics = allTopics.filter(isTopicCompleted);
  const reviewCandidates = startedTopics.filter(topic => !isTopicCompleted(topic));
  const reviewCounts = reviewCandidates.reduce<StudyCycleTransitionSummary['reviewCounts']>((counts, topic) => {
    const nextReview = asDate(getNextReviewAt(topic));

    if (!nextReview) {
      counts.unscheduled += 1;
      return counts;
    }

    const nextReviewDay = startOfLocalDay(nextReview).getTime();
    const todayTime = today.getTime();

    if (nextReviewDay < todayTime) counts.overdue += 1;
    else if (nextReviewDay === todayTime) counts.today += 1;
    else counts.future += 1;

    return counts;
  }, { overdue: 0, today: 0, future: 0, unscheduled: 0 });

  const minutesBySubject = visibleSubjects.map(subject => {
    const minutes = subject.topics.reduce(
      (sum, topic) => sum + Math.max(0, studyMinutesByTopicId.get(topic.id) || 0),
      0,
    );

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      minutes,
    };
  });
  const studiedSubjects = minutesBySubject
    .filter(subject => subject.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const topSubjectByStudyMinutes = studiedSubjects[0] || null;
  const lowestCandidate = studiedSubjects.length > 1 ? studiedSubjects[studiedSubjects.length - 1] : null;
  const lowestSubjectByStudyMinutes =
    lowestCandidate && topSubjectByStudyMinutes && lowestCandidate.minutes < topSubjectByStudyMinutes.minutes
      ? lowestCandidate
      : null;

  const totalStudyMinutes = minutesBySubject.reduce((sum, subject) => sum + subject.minutes, 0);
  const hasNoNewTopicsToStart = allTopics.length > 0 && startedTopics.length === allTopics.length;
  const isEditalCompleted = allTopics.length > 0 && completedTopics.length === allTopics.length;

  return {
    totalSubjects: visibleSubjects.length,
    firstContactClosedSubjects: visibleSubjects.filter(subject =>
      subject.topics.length > 0 && subject.topics.every(isTopicStarted)
    ).length,
    completedSubjects: visibleSubjects.filter(subject =>
      subject.topics.length > 0 && subject.topics.every(isTopicCompleted)
    ).length,
    totalTopics: allTopics.length,
    startedTopics: startedTopics.length,
    unstartedTopics: Math.max(0, allTopics.length - startedTopics.length),
    completedTopics: completedTopics.length,
    hasNoNewTopicsToStart,
    isEditalCompleted,
    reviewCounts,
    totalStudyMinutes,
    averageMinutesPerStartedTopic: startedTopics.length > 0 && totalStudyMinutes > 0
      ? Math.round(totalStudyMinutes / startedTopics.length)
      : null,
    topSubjectByStudyMinutes,
    lowestSubjectByStudyMinutes,
    primaryAction: getPrimaryAction(reviewCounts, isEditalCompleted, hasNoNewTopicsToStart),
  };
};
