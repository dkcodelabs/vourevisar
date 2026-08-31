/**
 * Motor puro do programa adaptativo do vouRevisar.
 *
 * O primeiro contato é seguido por quatro revisões programadas. A dificuldade e
 * os sinais reais escolhem a posição dentro de cada janela, mas nenhuma
 * avaliação impede o avanço da etapa.
 */

const EXAM_PROTECTION_DAYS = 7;

export const PROGRAMMED_REVIEW_COUNT = 4;
export const COMPLETION_CONTACT_COUNT = PROGRAMMED_REVIEW_COUNT + 1;

export const SRS_THRESHOLDS = {
  STABILITY_LOW: 15,
  STABILITY_MID: 45,
  INTERVAL_LONG: 21,
  MIN_CONSISTENCY: 4,
};

export type LearningStatus = 'Aprendendo' | 'Fixando' | 'Dominando';
export type ReviewDifficulty = 1 | 2 | 3;

export interface SRSMetrics {
  memoryStability: number;
  currentInterval: number;
  /** Contatos já concluídos: 0 antes do primeiro contato; 1 antes da R1. */
  reviewCount: number;
}

export interface CalculateNextReviewParams {
  today: Date;
  metrics: SRSMetrics;
  /** 1 = Fácil, 2 = Médio, 3 = Difícil. Todas avançam a etapa. */
  difficulty?: number;
  examDate?: Date | null;
  /** Positivo = dificuldade recente aumentando; negativo = diminuindo. */
  trendDelta?: number | null;
  /** Dias de atraso da revisão que acabou de ser concluída. */
  overdueDays?: number;
}

export interface CalculateNextReviewResult {
  nextReviewDate: Date | null;
  newMemoryStability: number;
  /** Intervalo efetivamente agendado. Zero quando o programa terminou. */
  newInterval: number;
  /** Dias até a data efetiva; pode ser menor quando a prova comprime a agenda. */
  scheduledInterval: number;
  isProgramCompleted: boolean;
  wasCompressed: boolean;
  compressionReason?: 'limit_exceeded' | 'limit_passed';
}

interface ReviewWindow {
  min: number;
  middle: number;
  max: number;
}

const REVIEW_WINDOWS: Record<number, ReviewWindow> = {
  0: { min: 1, middle: 1, max: 1 },
  1: { min: 5, middle: 7, max: 10 },
  2: { min: 15, middle: 22, max: 30 },
  3: { min: 60, middle: 75, max: 90 },
};

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = startOfDay(value);
  result.setDate(result.getDate() + days);
  return result;
}

function calendarDayDifference(later: Date, earlier: Date): number {
  const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((utcLater - utcEarlier) / 86_400_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDifficulty(value?: number): ReviewDifficulty {
  if (value == null || Number.isNaN(value)) return 2;
  return clamp(Math.round(value), 1, 3) as ReviewDifficulty;
}

function getBaseInterval(window: ReviewWindow, difficulty: ReviewDifficulty): number {
  if (difficulty === 1) return window.max;
  if (difficulty === 3) return window.min;
  return window.middle;
}

function getAdaptiveMultiplier(params: {
  difficulty: ReviewDifficulty;
  metrics: SRSMetrics;
  trendDelta?: number | null;
  overdueDays: number;
}): number {
  const { difficulty, metrics, trendDelta, overdueDays } = params;
  let multiplier = 1;

  if (metrics.currentInterval > 0 && metrics.memoryStability > 0) {
    const stabilityRatio = metrics.memoryStability / metrics.currentInterval;
    if (stabilityRatio < 0.75) multiplier *= 0.95;
    else if (stabilityRatio > 1.25) multiplier *= 1.05;
  }

  if (trendDelta != null) {
    if (trendDelta >= 0.5) multiplier *= 0.9;
    else if (trendDelta <= -0.5) multiplier *= 1.1;
  }

  if (overdueDays > 0) {
    if (difficulty === 3) multiplier *= 0.95;
    else if (difficulty === 1) multiplier *= 1.05;
  }

  return multiplier;
}

function updateMemoryStability(
  memoryStability: number,
  interval: number,
  difficulty: ReviewDifficulty,
): number {
  const previous = Math.max(1, memoryStability || 1);
  const difficultyFactor = difficulty === 1 ? 1.15 : difficulty === 3 ? 0.9 : 1.05;
  const updated = (previous + interval * 0.25) * difficultyFactor;
  return Number(clamp(updated, 1, 90).toFixed(2));
}

export function calculateNextReview(params: CalculateNextReviewParams): CalculateNextReviewResult {
  const {
    today,
    metrics,
    examDate = null,
    trendDelta = null,
    overdueDays = 0,
  } = params;
  const difficulty = normalizeDifficulty(params.difficulty);
  const todayStart = startOfDay(today);

  if (metrics.reviewCount >= PROGRAMMED_REVIEW_COUNT) {
    return {
      nextReviewDate: null,
      newMemoryStability: updateMemoryStability(
        metrics.memoryStability,
        metrics.currentInterval,
        difficulty,
      ),
      newInterval: 0,
      scheduledInterval: 0,
      isProgramCompleted: true,
      wasCompressed: false,
    };
  }

  const window = REVIEW_WINDOWS[metrics.reviewCount] ?? REVIEW_WINDOWS[3];
  const baseInterval = getBaseInterval(window, difficulty);
  const multiplier = metrics.reviewCount === 0
    ? 1
    : getAdaptiveMultiplier({
      difficulty,
      metrics,
      trendDelta,
      overdueDays: Math.max(0, overdueDays),
    });

  const newInterval = clamp(Math.round(baseInterval * multiplier), window.min, window.max);
  let nextReviewDate = addDays(todayStart, newInterval);
  let scheduledInterval = newInterval;
  let wasCompressed = false;
  let compressionReason: CalculateNextReviewResult['compressionReason'];

  if (examDate && !Number.isNaN(examDate.getTime())) {
    const examStart = startOfDay(examDate);
    const protectedLimit = addDays(examStart, -EXAM_PROTECTION_DAYS);

    if (nextReviewDate > protectedLimit) {
      wasCompressed = true;
      if (protectedLimit <= todayStart) {
        nextReviewDate = addDays(todayStart, 1);
        compressionReason = 'limit_passed';
      } else {
        nextReviewDate = protectedLimit;
        compressionReason = 'limit_exceeded';
      }
      scheduledInterval = Math.max(1, calendarDayDifference(nextReviewDate, todayStart));
    }
  }

  return {
    nextReviewDate,
    newMemoryStability: updateMemoryStability(metrics.memoryStability, newInterval, difficulty),
    newInterval,
    scheduledInterval,
    isProgramCompleted: false,
    wasCompressed,
    compressionReason,
  };
}

export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

export function describeCalculation(result: CalculateNextReviewResult): string {
  if (result.isProgramCompleted || !result.nextReviewDate) {
    return 'Programa automático concluído após quatro revisões.';
  }

  const dateStr = result.nextReviewDate.toLocaleDateString('pt-BR');
  if (!result.wasCompressed) {
    return `Revisão adaptativa agendada para ${dateStr} (+${result.scheduledInterval} dias).`;
  }
  if (result.compressionReason === 'limit_passed') {
    return `Revisão antecipada para ${dateStr} porque a prova está próxima.`;
  }
  return `Revisão ajustada para ${dateStr}, antes da semana da prova.`;
}
