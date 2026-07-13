import type { Topic } from '@/types';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { getTopicStrategicIncidence } from '@/utils/studyCycleStrategic';

export type CycleTopicStatusVisual = {
  label: string;
  badgeClassName: string;
  indicatorClassName: string;
  actionClassName: string;
};

export const getTopicFirstStudyDate = (topic: Topic): string | Date | null | undefined =>
  topic.first_studied_at || topic.firstStudiedAt;

export const isTopicNewlyStartedInCycle = (topic: Topic, cycleStart?: string | null): boolean => {
  if (!cycleStart) return false;

  const firstStudiedAt = getTopicFirstStudyDate(topic);
  if (!firstStudiedAt) return false;

  const firstStudiedTime = new Date(firstStudiedAt).getTime();
  const cycleStartTime = new Date(cycleStart).getTime();

  return Number.isFinite(firstStudiedTime) &&
    Number.isFinite(cycleStartTime) &&
    firstStudiedTime >= cycleStartTime;
};

export const isTopicCompleted = (topic: Topic) =>
  isReviewProgramCompleted(topic);

export const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

export const isTopicStarted = (topic: Topic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  Boolean(topic.nextReview) ||
  Boolean(topic.next_review) ||
  isTopicCompleted(topic);

export const isTopicInReviewFlow = (topic: Topic) =>
  !isTopicCompleted(topic) && (
    (topic.reviewCount || 0) > 0 ||
    (topic.review_count || 0) > 0 ||
    hasMeaningfulReviewStage(topic.reviewStage) ||
    hasMeaningfulReviewStage(topic.review_stage) ||
    Boolean(topic.nextReview) ||
    Boolean(topic.next_review)
  );

export const getTopicContactCount = (
  topic: Topic,
  topicStats?: Map<string, { reviewCount: number; hardReviewCount: number }>
) => Math.max(
  topic.reviewCount || 0,
  topic.review_count || 0,
  topicStats?.get(topic.id)?.reviewCount || 0
);

export const getCycleTopicStatusVisual = (
  topic: Topic,
  hasStarted = isTopicStarted(topic)
): CycleTopicStatusVisual => {
  if (isTopicCompleted(topic)) {
    return {
      label: 'Concluído',
      badgeClassName: 'bg-success/10 text-success',
      indicatorClassName: 'bg-success',
      actionClassName: 'border-transparent bg-transparent text-success hover:border-success/20 hover:bg-success/10',
    };
  }

  if (isTopicInReviewFlow(topic)) {
    return {
      label: 'Em revisão',
      badgeClassName: 'bg-primary/10 text-primary',
      indicatorClassName: 'bg-primary',
      actionClassName: 'border-transparent bg-transparent text-primary hover:border-primary/20 hover:bg-primary/10',
    };
  }

  if (hasStarted) {
    return {
      label: 'Iniciado',
      badgeClassName: 'bg-primary/10 text-primary',
      indicatorClassName: 'bg-primary',
      actionClassName: 'border-transparent bg-transparent text-primary hover:border-primary/20 hover:bg-primary/10',
    };
  }

  return {
    label: 'Não iniciado',
    badgeClassName: 'bg-muted text-content-muted',
    indicatorClassName: 'bg-content-muted/55',
    actionClassName: 'border-transparent bg-transparent text-content-muted hover:border-info/20 hover:bg-info/10 hover:text-info',
  };
};

const getStrategicTopicIncidence = (topic: Topic) =>
  getTopicStrategicIncidence({ totalVolume: topic.total_volume ?? null });

export const getStrategicTopicIncidenceTitle = (topic: Topic) => {
  const incidence = getStrategicTopicIncidence(topic);
  return incidence.showToStudent && topic.total_volume
    ? `Cobrança alta detectada por sinal bruto.`
    : 'Sem destaque de cobrança para exibir.';
};

export const getStrategicTopicIncidenceDisplay = (topic: Topic) => {
  const incidence = getStrategicTopicIncidence(topic);
  return incidence.showToStudent
    ? incidence.label
    : null;
};

export const formatStudyMinutes = (minutes: number) => {
  if (minutes <= 0) return 'Sem tempo registrado';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
};
