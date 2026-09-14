import { addDays, format, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DashboardUpcomingReviewDay, DashboardUpcomingReviews } from '@/types/dashboardDecision';

export interface TopicWithNextReview {
  id: string;
  nextReview?: string | null;
}

const parseReviewDate = (value?: string | null): Date | null => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const dateOnly = new Date(year, month - 1, day);
    return Number.isFinite(dateOnly.getTime()) ? dateOnly : null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const buildUpcomingReviews = (
  todayReviews: TopicWithNextReview[] = [],
  overdueReviews: TopicWithNextReview[] = [],
  futureReviews: TopicWithNextReview[] = [],
  now: Date = new Date(),
): DashboardUpcomingReviews => {
  const today = startOfDay(now);
  const days: DashboardUpcomingReviewDay[] = [];
  const dateMap = new Map<string, number>();

  for (let i = 0; i < 7; i += 1) {
    const current = addDays(today, i);
    const dateKey = format(current, 'yyyy-MM-dd');
    const dayOfWeek = format(current, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase();

    let dayLabel = format(current, 'dd/MM');
    if (i === 0) dayLabel = 'Hoje';
    else if (i === 1) dayLabel = 'Amanhã';

    days.push({
      date: dateKey,
      dayOfWeek,
      dayLabel,
      reviewCount: i === 0 ? todayReviews.length + overdueReviews.length : 0,
      overdueCount: i === 0 ? overdueReviews.length : undefined,
      isToday: i === 0,
    });

    dateMap.set(dateKey, i);
  }

  const windowEnd = startOfDay(addDays(today, 6));
  let totalBeyondWindow = 0;

  for (const topic of futureReviews) {
    const parsed = parseReviewDate(topic.nextReview);
    if (!parsed) continue;

    const reviewDay = startOfDay(parsed);
    const dateKey = format(reviewDay, 'yyyy-MM-dd');

    const index = dateMap.get(dateKey);
    if (index !== undefined) {
      days[index].reviewCount += 1;
    } else if (isAfter(reviewDay, windowEnd)) {
      totalBeyondWindow += 1;
    }
  }

  const totalInWindow = days.reduce((sum, day) => sum + day.reviewCount, 0);

  let peakDay: DashboardUpcomingReviews['peakDay'] = null;
  let maxCount = 0;

  for (const day of days) {
    if (day.reviewCount > maxCount) {
      maxCount = day.reviewCount;
      peakDay = {
        dayLabel: day.dayLabel,
        count: day.reviewCount,
      };
    }
  }

  return {
    days,
    totalInWindow,
    totalBeyondWindow,
    peakDay: maxCount > 0 ? peakDay : null,
  };
};

export interface UpcomingReviewsInsight {
  tone: 'info' | 'warning' | 'success';
  message: string;
}

export const getUpcomingReviewsInsight = (upcoming: DashboardUpcomingReviews): UpcomingReviewsInsight => {
  if (upcoming.totalInWindow === 0) {
    return {
      tone: 'info',
      message: 'Nenhuma revisão agendada nos próximos 7 dias. Excelente momento para iniciar novos tópicos.',
    };
  }

  if (upcoming.peakDay && upcoming.peakDay.count >= 8) {
    const dayText =
      upcoming.peakDay.dayLabel === 'Hoje' || upcoming.peakDay.dayLabel === 'Amanhã'
        ? upcoming.peakDay.dayLabel.toLowerCase()
        : `em ${upcoming.peakDay.dayLabel}`;

    return {
      tone: 'warning',
      message: `Pico previsto: ${upcoming.peakDay.count} revisões ${dayText}. Reserve um tempo extra de estudo.`,
    };
  }

  const dailyAvg = Math.max(1, Math.round(upcoming.totalInWindow / 7));
  return {
    tone: 'success',
    message: `Carga equilibrada: média de ~${dailyAvg} ${dailyAvg === 1 ? 'revisão/dia' : 'revisões/dia'} nesta semana.`,
  };
};
