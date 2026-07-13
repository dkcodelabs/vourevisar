import { isReviewProgramCompleted } from '@/utils/reviewStage';
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
  cycleExamDate?: string | null;
  cycleStart?: string | null;
  recentFirstContactWindowDays?: number;
  firstContactStudyDurationsMinutes?: number[];
  reviewsDoneToday?: number;
  hasCycleHistory?: boolean;
  hasActiveCycle?: boolean;
  now?: Date;
};

export type StudyCyclePaceState = 'ready' | 'missing_cycle' | 'missing_exam_date' | 'exam_date_past' | 'insufficient_data';

export type StudyCyclePaceMetrics = {
  state: StudyCyclePaceState;
  daysRemaining: number | null;
  newTopicsPerDay: number | null;
  reviewsPerDay: number | null;
  unstartedTopics: number;
  pendingReviews: number;
  futureReviewsInWindow: number;
  recentFirstContact: {
    state: 'ready' | 'insufficient_data';
    windowDays: number;
    topicsStarted: number;
    topicsPerDay: number | null;
    projectedDaysToFirstContact: number | null;
    averageStudyMinutes: number | null;
  };
  explanation: string;
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

const buildRecentFirstContactMetrics = ({
  firstContactDates,
  firstContactStudyDurationsMinutes = [],
  now,
  unstartedTopics,
  windowDays,
}: {
  firstContactDates: Array<Date | string | null | undefined>;
  firstContactStudyDurationsMinutes?: number[];
  now: Date;
  unstartedTopics: number;
  windowDays: number;
}): StudyCyclePaceMetrics['recentFirstContact'] => {
  const today = startOfLocalDay(now);
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - Math.max(1, windowDays - 1));

  const topicsStarted = firstContactDates
    .map(asDate)
    .filter((date): date is Date => {
      if (!date) return false;
      const day = startOfLocalDay(date);
      return day.getTime() >= windowStart.getTime() && day.getTime() <= today.getTime();
    }).length;
  const validDurations = firstContactStudyDurationsMinutes.filter(minutes =>
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
  );
  const averageStudyMinutes = validDurations.length > 0
    ? validDurations.reduce((sum, minutes) => sum + minutes, 0) / validDurations.length
    : null;

  if (topicsStarted < 2) {
    return {
      state: 'insufficient_data',
      windowDays,
      topicsStarted,
      topicsPerDay: null,
      projectedDaysToFirstContact: null,
      averageStudyMinutes,
    };
  }

  const topicsPerDay = topicsStarted / windowDays;

  return {
    state: 'ready',
    windowDays,
    topicsStarted,
    topicsPerDay,
    projectedDaysToFirstContact: unstartedTopics > 0
      ? Math.ceil(unstartedTopics / topicsPerDay)
      : 0,
    averageStudyMinutes,
  };
};

export const buildStudyCyclePaceMetrics = ({
  examDate,
  today = new Date(),
  unstartedTopics,
  overdueReviews,
  dueTodayReviews,
  futureReviewsInWindow,
  hasActiveCycle,
  recentFirstContact,
}: {
  examDate: string | Date | null;
  today?: Date;
  unstartedTopics: number;
  overdueReviews: number;
  dueTodayReviews: number;
  futureReviewsInWindow: number;
  hasActiveCycle: boolean;
  recentFirstContact?: StudyCyclePaceMetrics['recentFirstContact'];
}): StudyCyclePaceMetrics => {
  const pendingReviews = overdueReviews + dueTodayReviews + futureReviewsInWindow;
  const firstContactPace = recentFirstContact ?? {
    state: 'insufficient_data',
    windowDays: 7,
    topicsStarted: 0,
    topicsPerDay: null,
    projectedDaysToFirstContact: null,
    averageStudyMinutes: null,
  };

  if (!hasActiveCycle) {
    return {
      state: 'missing_cycle',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics,
      pendingReviews,
      futureReviewsInWindow,
      recentFirstContact: firstContactPace,
      explanation: 'Carregue um ciclo para calcular ritmo.',
    };
  }

  const parsedExamDate = asDate(examDate);

  if (!parsedExamDate) {
    return {
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics,
      pendingReviews,
      futureReviewsInWindow,
      recentFirstContact: firstContactPace,
      explanation: 'Defina uma data de prova para calcular o ritmo necessário.',
    };
  }

  const daysRemaining = daysBetweenStartOfDay(parsedExamDate, today);

  if (daysRemaining < 0) {
    return {
      state: 'exam_date_past',
      daysRemaining,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics,
      pendingReviews,
      futureReviewsInWindow,
      recentFirstContact: firstContactPace,
      explanation: 'A data da prova já passou. Atualize a data para recalcular o ritmo.',
    };
  }

  const divisor = Math.max(daysRemaining, 1);

  return {
    state: 'ready',
    daysRemaining,
    newTopicsPerDay: unstartedTopics / divisor,
    reviewsPerDay: pendingReviews / divisor,
    unstartedTopics,
    pendingReviews,
    futureReviewsInWindow,
    recentFirstContact: firstContactPace,
    explanation: 'Cálculo baseado nos tópicos não iniciados, revisões pendentes e revisões futuras até a prova.',
  };
};

const isTopicCompleted = (topic: MetricTopic) =>
  isReviewProgramCompleted(topic);

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
  cycleExamDate,
  cycleStart,
  recentFirstContactWindowDays = 7,
  firstContactStudyDurationsMinutes = [],
  reviewsDoneToday = 0,
  hasCycleHistory = false,
  hasActiveCycle = true,
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

  const cycleExam = asDate(cycleExamDate);
  const nearestEditalExam = editais
    .map(edital => asDate(edital.exam_date || edital.examDate || null))
    .filter((date): date is Date => Boolean(date))
    .map(date => ({ date, daysUntil: daysBetweenStartOfDay(date, now) }))
    .filter(item => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;
  const examContext = cycleExam
    ? { date: cycleExam, daysUntil: daysBetweenStartOfDay(cycleExam, now) }
    : nearestEditalExam;
  const nearestExam = examContext && examContext.daysUntil >= 0 ? examContext : null;
  const paceExamDate = examContext?.date ?? null;
  const futureReviewsInWindow = reviewCandidates.filter(topic => {
    const date = asDate(nextReviewDate(topic));
    if (!date || startOfLocalDay(date).getTime() <= today.getTime()) return false;
    if (!paceExamDate) return true;
    return startOfLocalDay(date).getTime() <= startOfLocalDay(paceExamDate).getTime();
  }).length;

  const dailyNewTopicsGoal = nearestExam && unstartedTopics.length > 0
    ? Math.max(1, Math.ceil(unstartedTopics.length / Math.max(1, nearestExam.daysUntil)))
    : 0;
  const newTopicDeficitToday = Math.max(0, dailyNewTopicsGoal - topicsStartedToday);
  const reviewDeficitToday = Math.max(0, dailyReviewGoal - reviewsDoneToday);
  const topicsPerDayInCycle = topicsStartedInCycle / cycleElapsedDays;
  const estimatedDaysToFirstContact = topicsPerDayInCycle > 0
    ? Math.ceil(unstartedTopics.length / topicsPerDayInCycle)
    : null;
  const recentFirstContact = buildRecentFirstContactMetrics({
    firstContactDates: allTopics.map(firstStudyDate),
    firstContactStudyDurationsMinutes,
    now,
    unstartedTopics: unstartedTopics.length,
    windowDays: recentFirstContactWindowDays,
  });
  const pace = buildStudyCyclePaceMetrics({
    examDate: paceExamDate,
    today: now,
    unstartedTopics: unstartedTopics.length,
    overdueReviews,
    dueTodayReviews,
    futureReviewsInWindow,
    hasActiveCycle,
    recentFirstContact,
  });

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
    pace,
  };
};
