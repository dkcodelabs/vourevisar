import { getVisibleCycleTopics } from './studyCycleTopicVisibility';

type MetricTopic = {
  id: string;
  completed?: boolean;
  is_completed?: boolean;
  reviewCount?: number;
  review_count?: number;
  reviewStage?: string | null;
  review_stage?: string | null;
  firstStudiedAt?: Date | string | null;
  first_studied_at?: string | null;
  nextReview?: Date | string | null;
  next_review?: string | null;
  total_volume?: number | null;
  is_active?: boolean;
  is_hidden?: boolean | null;
};

type MetricSubject = {
  id: string;
  topics: MetricTopic[];
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
};

type MetricEdital = {
  exam_date?: string | null;
  examDate?: string | null;
};

export type StudyCycleMaturity = 'cold_start' | 'started' | 'active' | 'historical';

type GetStudyCycleMetricsInput = {
  subjects: MetricSubject[];
  editais?: MetricEdital[];
  cycleStart?: string | null;
  reviewsDoneToday?: number;
  hasCycleHistory?: boolean;
  now?: Date;
};

const asDate = (value?: Date | string | null) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const dateOnly = new Date(year, month - 1, day);
    return Number.isFinite(dateOnly.getTime()) ? dateOnly : null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const startOfLocalDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isSameLocalDay = (value: Date | string | null | undefined, day: Date) => {
  const date = asDate(value);
  if (!date) return false;
  return startOfLocalDay(date).getTime() === startOfLocalDay(day).getTime();
};

const daysBetweenStartOfDay = (future: Date, now: Date) =>
  Math.ceil((startOfLocalDay(future).getTime() - startOfLocalDay(now).getTime()) / (1000 * 60 * 60 * 24));

const isTopicCompleted = (topic: MetricTopic) =>
  topic.completed === true ||
  topic.is_completed === true ||
  topic.reviewStage === 'Concluído' ||
  topic.review_stage === 'Concluído';

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const isTopicStarted = (topic: MetricTopic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  isTopicCompleted(topic);

const firstStudyDate = (topic: MetricTopic) =>
  topic.first_studied_at || topic.firstStudiedAt || null;

const nextReviewDate = (topic: MetricTopic) =>
  topic.next_review || topic.nextReview || null;

const activeTopics = (subject: MetricSubject) =>
  getVisibleCycleTopics(subject.topics);

const hasKnownWeight = (subject: MetricSubject) =>
  typeof subject.exam_weight_percentage === 'number' ||
  typeof subject.exam_weight_points === 'number' ||
  typeof subject.exam_weight_questions === 'number';

export const getStudyCycleMetrics = ({
  subjects,
  editais = [],
  cycleStart,
  reviewsDoneToday = 0,
  hasCycleHistory = false,
  now = new Date(),
}: GetStudyCycleMetricsInput) => {
  const allTopics = subjects.flatMap(activeTopics);
  const today = startOfLocalDay(now);
  const cycleStartDate = asDate(cycleStart);
  const cycleElapsedDays = cycleStartDate
    ? Math.max(1, Math.ceil((today.getTime() - startOfLocalDay(cycleStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  const startedTopics = allTopics.filter(isTopicStarted);
  const unstartedTopics = allTopics.filter(topic => !isTopicStarted(topic));
  const completedTopics = allTopics.filter(isTopicCompleted);
  const topicsStartedToday = allTopics.filter(topic => isSameLocalDay(firstStudyDate(topic), today)).length;
  const topicsStartedInCycle = cycleStartDate
    ? allTopics.filter(topic => {
        const date = asDate(firstStudyDate(topic));
        return date && date.getTime() >= cycleStartDate.getTime();
      }).length
    : startedTopics.length;

  const reviewCandidates = allTopics.filter(topic => isTopicStarted(topic) && !isTopicCompleted(topic));
  const overdueReviews = reviewCandidates.filter(topic => {
    const date = asDate(nextReviewDate(topic));
    return date && startOfLocalDay(date).getTime() < today.getTime();
  }).length;
  const dueTodayReviews = reviewCandidates.filter(topic => isSameLocalDay(nextReviewDate(topic), today)).length;
  const futureReviews = reviewCandidates.filter(topic => {
    const date = asDate(nextReviewDate(topic));
    return date && startOfLocalDay(date).getTime() > today.getTime();
  }).length;
  const dailyReviewGoal = overdueReviews + dueTodayReviews;

  const nearestExam = editais
    .map(edital => asDate(edital.exam_date || edital.examDate || null))
    .filter((date): date is Date => Boolean(date))
    .map(date => ({ date, daysUntil: daysBetweenStartOfDay(date, now) }))
    .filter(item => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;

  const dailyNewTopicsGoal = nearestExam && unstartedTopics.length > 0
    ? Math.max(1, Math.ceil(unstartedTopics.length / Math.max(1, nearestExam.daysUntil)))
    : 0;
  const newTopicDeficitToday = Math.max(0, dailyNewTopicsGoal - topicsStartedToday);
  const reviewDeficitToday = Math.max(0, dailyReviewGoal - reviewsDoneToday);
  const topicsPerDayInCycle = topicsStartedInCycle / cycleElapsedDays;
  const estimatedDaysToFirstContact = topicsPerDayInCycle > 0
    ? Math.ceil(unstartedTopics.length / topicsPerDayInCycle)
    : null;

  const importantUnstartedTopics = subjects.flatMap(subject =>
    activeTopics(subject)
      .filter(topic => !isTopicStarted(topic))
      .filter(topic => (typeof topic.total_volume === 'number' && topic.total_volume > 0) || hasKnownWeight(subject))
  ).length;

  const maturity: StudyCycleMaturity = hasCycleHistory
    ? 'historical'
    : startedTopics.length === 0
      ? 'cold_start'
      : startedTopics.length < 3 || cycleElapsedDays < 3
        ? 'started'
        : 'active';

  return {
    maturity,
    totalTopics: allTopics.length,
    startedTopics: startedTopics.length,
    unstartedTopics: unstartedTopics.length,
    completedTopics: completedTopics.length,
    topicsStartedToday,
    topicsStartedInCycle,
    reviewsDoneToday,
    overdueReviews,
    dueTodayReviews,
    futureReviews,
    dailyNewTopicsGoal,
    dailyReviewGoal,
    newTopicDeficitToday,
    reviewDeficitToday,
    topicsPerDayInCycle,
    estimatedDaysToFirstContact,
    importantUnstartedTopics,
    daysUntilExam: nearestExam?.daysUntil ?? null,
  };
};
