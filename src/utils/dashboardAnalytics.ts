import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getReviewScheduleBucket } from '@/utils/reviewSchedule';
import type {
  DashboardCompactMetrics,
  DashboardCycleSubject,
  DashboardHeatmapDay,
  DashboardSubjectPerformance,
  DashboardUpcomingReviews,
  DashboardWeeklyPlanning,
  DashboardWeeklyPlanningDay,
} from '@/types/dashboardDecision';

export interface SessionDataRow {
  subject_id?: string | null;
  study_date: string;
  session_duration_minutes?: number | null;
}

export interface PracticeAttemptRow {
  topic_id?: string | null;
  result: string;
  created_at?: string;
  attempt_kind?: string;
}

export interface ReviewHistoryRow {
  topic_id?: string | null;
  reviewed_at: string;
}

const SHORT_DAYS_MON_SUN = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function calculateCompactMetrics({
  sessions = [],
  historyRows = [],
  practiceAttempts = [],
  practiceAnsweredCount = 0,
  flashcardsReviewedCount = 0,
}: {
  sessions?: SessionDataRow[];
  historyRows?: ReviewHistoryRow[];
  practiceAttempts?: PracticeAttemptRow[];
  practiceAnsweredCount?: number;
  flashcardsReviewedCount?: number;
}): DashboardCompactMetrics {
  const activeDaysSet = new Set<string>();
  let totalStudyMinutes = 0;

  for (const session of sessions) {
    if (session.session_duration_minutes && session.session_duration_minutes > 0) {
      totalStudyMinutes += session.session_duration_minutes;
    }
    if (session.study_date) {
      activeDaysSet.add(session.study_date.slice(0, 10));
    }
  }

  for (const row of historyRows) {
    if (row.reviewed_at) {
      activeDaysSet.add(row.reviewed_at.slice(0, 10));
    }
  }

  for (const attempt of practiceAttempts) {
    if (attempt.created_at) {
      activeDaysSet.add(attempt.created_at.slice(0, 10));
    }
  }

  const activeStudyDays = activeDaysSet.size;
  const dailyAverageMinutes = activeStudyDays > 0
    ? Math.round(totalStudyMinutes / activeStudyDays)
    : 0;
  const totalPracticeItems = practiceAnsweredCount + flashcardsReviewedCount;

  return {
    totalStudyMinutes,
    dailyAverageMinutes,
    activeStudyDays,
    totalPracticeItems,
  };
}

export function calculateSubjectPerformance({
  subjects = [],
  sessions = [],
  practiceAttempts = [],
  topicToSubjectMap,
}: {
  subjects?: DashboardCycleSubject[];
  sessions?: SessionDataRow[];
  practiceAttempts?: PracticeAttemptRow[];
  topicToSubjectMap?: Map<string, string>;
}): DashboardSubjectPerformance[] {
  const resolvedTopicToSubject = topicToSubjectMap || new Map<string, string>();
  if (!topicToSubjectMap) {
    for (const sub of subjects) {
      for (const t of sub.topics) {
        resolvedTopicToSubject.set(t.id, sub.id);
      }
    }
  }

  const timeBySubject = new Map<string, number>();
  for (const session of sessions) {
    if (session.subject_id && session.session_duration_minutes) {
      const current = timeBySubject.get(session.subject_id) || 0;
      timeBySubject.set(session.subject_id, current + session.session_duration_minutes);
    }
  }

  const practiceBySubject = new Map<string, { correct: number; incorrect: number; skipped: number }>();
  for (const attempt of practiceAttempts) {
    if (!attempt.topic_id) continue;
    const subjectId = resolvedTopicToSubject.get(attempt.topic_id);
    if (!subjectId) continue;

    const current = practiceBySubject.get(subjectId) || { correct: 0, incorrect: 0, skipped: 0 };
    if (attempt.result === 'correct' || attempt.result === 'recalled') {
      current.correct += 1;
    } else if (attempt.result === 'incorrect' || attempt.result === 'forgotten') {
      current.incorrect += 1;
    } else if (attempt.result === 'skipped') {
      current.skipped += 1;
    }
    practiceBySubject.set(subjectId, current);
  }

  return subjects.map((subject) => {
    const stats = practiceBySubject.get(subject.id) || { correct: 0, incorrect: 0, skipped: 0 };
    const totalMinutes = timeBySubject.get(subject.id) || 0;
    const answered = stats.correct + stats.incorrect;
    const accuracyPercentage = answered > 0
      ? Math.round((stats.correct / answered) * 100)
      : null;

    const totalTopics = subject.topics ? subject.topics.length : 0;
    const completedTopics = subject.topics
      ? subject.topics.filter((t) => Boolean(t.completed)).length
      : 0;
    const overdueReviewsCount = subject.topics
      ? subject.topics.filter((t) => getReviewScheduleBucket(t) === 'overdue').length
      : 0;

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      color: subject.color ?? null,
      completedTopics,
      totalTopics,
      overdueReviewsCount,
      correct: stats.correct,
      incorrect: stats.incorrect,
      skipped: stats.skipped,
      totalMinutes,
      accuracyPercentage,
    };
  });
}

export function calculateConsistencyHeatmap({
  referenceDate = new Date(),
  weeksCount = 14,
  sessions = [],
  historyRows = [],
  practiceAttempts = [],
}: {
  referenceDate?: Date;
  weeksCount?: number;
  sessions?: SessionDataRow[];
  historyRows?: ReviewHistoryRow[];
  practiceAttempts?: PracticeAttemptRow[];
}): {
  days: DashboardHeatmapDay[];
  currentStreak: number;
  totalActiveDays: number;
} {
  const ref = startOfDay(referenceDate);
  // Alinhamento exato de semanas estilo GitHub: cada coluna de 7 dias representa Segunda a Domingo.
  // A última coluna representa a semana corrente (Segunda a Domingo).
  const currentWeekStart = startOfWeek(ref, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(ref, { weekStartsOn: 1 });
  const startDate = subWeeks(currentWeekStart, weeksCount - 1);

  const minutesByDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.study_date && s.session_duration_minutes) {
      const dateKey = s.study_date.slice(0, 10);
      minutesByDate.set(dateKey, (minutesByDate.get(dateKey) || 0) + s.session_duration_minutes);
    }
  }

  const reviewsByDate = new Map<string, number>();
  for (const h of historyRows) {
    if (h.reviewed_at) {
      const dateKey = h.reviewed_at.slice(0, 10);
      reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) || 0) + 1);
    }
  }

  const practiceByDate = new Map<string, number>();
  for (const p of practiceAttempts) {
    if (p.created_at) {
      const dateKey = p.created_at.slice(0, 10);
      practiceByDate.set(dateKey, (practiceByDate.get(dateKey) || 0) + 1);
    }
  }

  const daysInterval = eachDayOfInterval({ start: startDate, end: currentWeekEnd });
  let totalActiveDays = 0;

  const days: DashboardHeatmapDay[] = daysInterval.map((d) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const isToday = isSameDay(d, ref);
    const isFuture = isAfter(d, ref);
    const studyMinutes = minutesByDate.get(dateKey) || 0;
    const reviewsCount = reviewsByDate.get(dateKey) || 0;
    const practiceCount = practiceByDate.get(dateKey) || 0;

    const hasActivity = !isFuture && (studyMinutes > 0 || reviewsCount > 0 || practiceCount > 0);
    if (hasActivity) totalActiveDays += 1;

    let intensity: DashboardHeatmapDay['intensity'] = 'none';
    if (hasActivity) {
      if (studyMinutes >= 60 || reviewsCount >= 5 || practiceCount >= 15) {
        intensity = 'exceeded';
      } else if (studyMinutes >= 25 || reviewsCount >= 2 || practiceCount >= 5) {
        intensity = 'completed';
      } else {
        intensity = 'partial';
      }
    }

    return {
      date: dateKey,
      intensity,
      studyMinutes,
      reviewsCount,
      practiceCount,
      isToday,
      isFuture,
    };
  });

  let currentStreak = 0;
  const todayKey = format(ref, 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(ref, 1), 'yyyy-MM-dd');

  const todayHasActivity = (minutesByDate.get(todayKey) || 0) > 0 ||
    (reviewsByDate.get(todayKey) || 0) > 0 ||
    (practiceByDate.get(todayKey) || 0) > 0;

  const yesterdayHasActivity = (minutesByDate.get(yesterdayKey) || 0) > 0 ||
    (reviewsByDate.get(yesterdayKey) || 0) > 0 ||
    (practiceByDate.get(yesterdayKey) || 0) > 0;

  let checkDate = todayHasActivity ? ref : (yesterdayHasActivity ? subDays(ref, 1) : null);

  while (checkDate) {
    const key = format(checkDate, 'yyyy-MM-dd');
    const active = (minutesByDate.get(key) || 0) > 0 ||
      (reviewsByDate.get(key) || 0) > 0 ||
      (practiceByDate.get(key) || 0) > 0;

    if (active) {
      currentStreak += 1;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return {
    days,
    currentStreak,
    totalActiveDays,
  };
}

export function calculateWeeklyPlanning({
  referenceDate = new Date(),
  weeklyGoalHours = 20,
  sessions = [],
  upcomingReviews,
  historyRows = [],
}: {
  referenceDate?: Date;
  weeklyGoalHours?: number;
  sessions?: SessionDataRow[];
  upcomingReviews?: DashboardUpcomingReviews;
  historyRows?: ReviewHistoryRow[];
}): DashboardWeeklyPlanning {
  const ref = startOfDay(referenceDate);
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(ref, { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const minutesByDate = new Map<string, number>();
  let currentWeekMinutes = 0;

  for (const s of sessions) {
    if (s.study_date && s.session_duration_minutes) {
      const dateKey = s.study_date.slice(0, 10);
      const sessionDate = parseISO(dateKey);
      if (sessionDate >= weekStart && sessionDate <= weekEnd) {
        currentWeekMinutes += s.session_duration_minutes;
        minutesByDate.set(dateKey, (minutesByDate.get(dateKey) || 0) + s.session_duration_minutes);
      }
    }
  }

  // Mapear revisões concluídas por data no histórico para refletir atividade nos dias passados da semana
  const completedReviewsByDate = new Map<string, number>();
  for (const h of historyRows) {
    if (h.reviewed_at) {
      const dateKey = h.reviewed_at.slice(0, 10);
      completedReviewsByDate.set(dateKey, (completedReviewsByDate.get(dateKey) || 0) + 1);
    }
  }

  const upcomingMap = new Map<string, { reviewCount: number; overdueCount?: number }>();
  if (upcomingReviews?.days) {
    for (const d of upcomingReviews.days) {
      upcomingMap.set(d.date, { reviewCount: d.reviewCount, overdueCount: d.overdueCount });
    }
  }

  const days: DashboardWeeklyPlanningDay[] = weekDays.map((d, index) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const isToday = isSameDay(d, ref);
    const dayLabel = format(d, 'EEEE, dd/MM', { locale: ptBR });
    const shortDay = SHORT_DAYS_MON_SUN[index % 7];
    const studyMinutes = minutesByDate.get(dateKey) || 0;
    const up = upcomingMap.get(dateKey);

    let reviewCount = 0;
    if (isToday || isAfter(d, ref)) {
      reviewCount = up?.reviewCount ?? 0;
    } else {
      // Dia passado da semana atual: exibe revisões concluídas
      reviewCount = completedReviewsByDate.get(dateKey) || 0;
    }

    const hasOverdue = Boolean(isToday && up?.overdueCount && up.overdueCount > 0);
    const isFuture = isAfter(d, ref);

    return {
      date: dateKey,
      dayLabel,
      shortDay,
      reviewCount,
      studyMinutes,
      isToday,
      hasOverdue,
      isFuture,
    };
  });

  return {
    currentWeekMinutes,
    weeklyGoalHours: Math.max(1, weeklyGoalHours),
    days,
  };
}
