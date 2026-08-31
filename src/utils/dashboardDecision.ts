import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type {
  DashboardAction,
  DashboardActionTarget,
  DashboardCycleSubject,
  DashboardCycleTopic,
  DashboardDataIssueSource,
  DashboardPace,
  DashboardProgressSummary,
  DashboardReviewTopic,
  DashboardRecentPaceDay,
} from '@/types/dashboardDecision';
import { buildStudyCyclePaceMetrics } from './studyCycleMetrics';

/** Resolves display focus only; it never starts a session or changes cycle order. */
export function resolveDashboardNavigation(
  href: string,
  target: DashboardActionTarget | undefined,
  subjects: DashboardCycleSubject[],
): { href: string; state?: { focusSubjectId: string; focusTopicId?: string }; unavailable: boolean } {
  if (href !== '/ciclo-estudos' || (!target?.subjectId && !target?.topicId)) {
    return { href, unavailable: false };
  }

  // Topic identity wins over a source subject id after a subject merge.
  const subject = target.topicId
    ? subjects.find(item => item.topics.some(topic => topic.id === target.topicId))
    : subjects.find(item => item.id === target.subjectId);

  if (!subject) return { href, unavailable: true };

  return {
    href,
    state: {
      focusSubjectId: subject.id,
      ...(target.topicId ? { focusTopicId: target.topicId } : {}),
    },
    unavailable: false,
  };
}

export function normalizeReminderDate(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 10);
}

export function getDashboardDataIssues({
  activityError,
  remindersError,
}: {
  activityError: unknown;
  remindersError: unknown;
}): DashboardDataIssueSource[] {
  return [
    ...(activityError ? ['activity' as const] : []),
    ...(remindersError ? ['reminders' as const] : []),
  ];
}

export function getDashboardCriticalError({
  reviewsError,
  cycleError,
  editaisError,
}: {
  reviewsError: unknown;
  cycleError: unknown;
  editaisError: unknown;
}) {
  return reviewsError ?? cycleError ?? editaisError ?? null;
}

export function getPaceBannerAction(state: DashboardPace['state']) {
  if (state === 'missing_exam_date') {
    return { label: 'Definir data da prova', href: '/meus-editais' };
  }
  if (state === 'exam_date_past') {
    return { label: 'Atualizar data da prova', href: '/meus-editais' };
  }
  if (state === 'missing_cycle') {
    return { label: 'Carregar edital no ciclo', href: '/meus-editais' };
  }
  return null;
}

export function formatPaceRequirement(value: number | null) {
  if (value === null) return { value: '--', cadence: '' };
  if (value > 0 && value < 1) {
    const intervalDays = Math.max(2, Math.round(1 / value));
    return { value: '1', cadence: `a cada ${intervalDays} dias` };
  }

  return {
    value: value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
    cadence: 'por dia',
  };
}

export function formatPaceValue(value: number | null) {
  if (value === null) return '--';
  if (value > 0 && value < 1) {
    const intervalDays = Math.max(2, Math.round(1 / value));
    return `1 a cada ${intervalDays} dias`;
  }

  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/dia`;
}

/** Keep the dashboard's existing seven-day window, zero days and one-decimal rounding. */
export function getDashboardRecentPace(activityDays: DashboardRecentPaceDay[]) {
  const recentDays = activityDays.slice(-7);
  const periodDivisor = Math.max(recentDays.length, 1);
  const studiedTopics = recentDays.reduce((total, day) => total + day.studiedCount, 0);
  const completedReviews = recentDays.reduce((total, day) => total + day.reviewedCount, 0);
  return {
    recentDays,
    studiedTopics,
    completedReviews,
    currentTopicsAverage: Number((studiedTopics / periodDivisor).toFixed(1)),
    currentReviewsAverage: Number((completedReviews / periodDivisor).toFixed(1)),
  };
}

export interface ReviewBuckets {
  overdue: DashboardReviewTopic[];
  today: DashboardReviewTopic[];
  future: DashboardReviewTopic[];
}

const dayKey = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');

export function getDashboardEditalIdentity(edital?: { name: string; position?: string | null }) {
  const originalName = edital?.name?.trim() || null;
  const position = edital?.position?.trim() || null;

  if (!originalName || !position) {
    return {
      editalName: originalName,
      position,
    };
  }

  const escapedPosition = position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const repeatedPosition = new RegExp(`\\s*(?:[-–—:•|]\\s*)${escapedPosition}\\s*$`, 'iu');
  const editalName = originalName.replace(repeatedPosition, '').trim() || originalName;

  return {
    editalName,
    position,
  };
}

export const isTopicStarted = (topic: DashboardCycleTopic) =>
  Boolean(topic.firstStudiedAt) || Boolean(topic.reviewCount && topic.reviewCount > 0);

export function splitReviewsByDueDate(topics: DashboardReviewTopic[], today = new Date()): ReviewBuckets {
  const todayKey = dayKey(today);

  return topics.reduce<ReviewBuckets>(
    (acc, topic) => {
      if (!topic.nextReview) return acc;
      const reviewKey = dayKey(new Date(topic.nextReview));

      if (reviewKey < todayKey) acc.overdue.push(topic);
      else if (reviewKey === todayKey) acc.today.push(topic);
      else acc.future.push(topic);

      return acc;
    },
    { overdue: [], today: [], future: [] },
  );
}

export function getNextCycleActions(subjects: DashboardCycleSubject[], limit = 3): DashboardAction[] {
  const sortedSubjects = subjects
    .filter((subject) => !subject.isCompletedInCycle)
    .sort((a, b) => {
      const startedTopicsA = a.topics.filter(isTopicStarted).length;
      const startedTopicsB = b.topics.filter(isTopicStarted).length;

      // First contacts rotate through the active subjects. Cycle position is
      // only the tiebreaker, so a student does not exhaust one subject before
      // seeing the next one in the configured cycle.
      return startedTopicsA - startedTopicsB || a.cyclePosition - b.cyclePosition;
    });
  const actions: DashboardAction[] = [];

  for (const subject of sortedSubjects) {
    const nextTopic = subject.topics.find((topic) => !topic.completed && !isTopicStarted(topic));
    const continueTopic = subject.topics.find((topic) => !topic.completed && isTopicStarted(topic));
    const topic = nextTopic || continueTopic;
    if (!topic) continue;

    const startsNewTopic = !isTopicStarted(topic);

    actions.push({
      id: `${startsNewTopic ? 'start' : 'continue'}:${topic.id}`,
      kind: startsNewTopic ? 'start_cycle_topic' : 'continue_cycle_topic',
      tone: 'info',
      title: startsNewTopic ? `Iniciar ${topic.name}` : `Continuar ${topic.name}`,
      description: `${subject.name} • ${startsNewTopic ? 'Primeiro contato' : 'Estudo em andamento'}`,
      reason: startsNewTopic
        ? 'Alterna as matérias pela ordem que você definiu no Ciclo de Estudos.'
        : 'Mantém continuidade no ciclo sem trocar sua ordem.',
      scientificBasis: startsNewTopic
        ? 'Primeiro contato organizado reduz troca de contexto e mantém progresso incremental.'
        : 'Continuar um tópico já iniciado diminui perda de contexto antes de abrir novo conteúdo.',
      primaryLabel: 'Abrir tópico no ciclo',
      primaryHref: '/ciclo-estudos',
      secondaryLabel: 'Ver no ciclo',
      secondaryHref: '/ciclo-estudos',
      target: {
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
      },
      priorityScore: startsNewTopic ? 60 : 50,
      dueDate: topic.nextReview ?? null,
      metadata: { reviewCount: topic.reviewCount ?? 0 },
    });

    if (actions.length >= limit) break;
  }

  return actions;
}

const reviewAction = (
  topic: DashboardReviewTopic,
  kind: 'review_overdue' | 'review_today',
  today = new Date(),
): DashboardAction => {
  const daysOverdue = topic.nextReview ? Math.max(0, differenceInCalendarDays(today, new Date(topic.nextReview))) : null;

  return {
    id: `${kind}:${topic.id}`,
    kind,
    tone: kind === 'review_overdue' ? 'danger' : 'warning',
    title: `Revisar ${topic.name}`,
    description: `${topic.subjectName} • Revisão ${topic.reviewCount + 1}`,
    reason:
      kind === 'review_overdue'
        ? `Este tópico está atrasado${daysOverdue ? ` há ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}` : ''}.`
        : 'Este tópico vence hoje e deve ser revisado antes de virar atraso.',
    scientificBasis:
      kind === 'review_overdue'
        ? 'Na revisão espaçada, atraso aumenta risco de esquecimento; recuperar agora protege a retenção.'
        : 'Revisar no dia programado reforça recuperação ativa antes da queda de memória.',
    primaryLabel: 'Revisar agora',
    primaryHref: `/revisoes?topicId=${topic.id}`,
    secondaryLabel: 'Abrir tópico',
    secondaryHref: `/revisoes?topicId=${topic.id}`,
    target: {
      subjectId: topic.subjectId,
      subjectName: topic.subjectName,
      topicId: topic.id,
      topicName: topic.name,
    },
    priorityScore: kind === 'review_overdue' ? 100 : 80,
    dueDate: topic.nextReview,
    metadata: {
      reviewCount: topic.reviewCount,
      daysOverdue,
    },
  };
};

export function buildNextBestAction(params: {
  overdueReviews: DashboardReviewTopic[];
  todayReviews: DashboardReviewTopic[];
  cycleActions: DashboardAction[];
  strategicActions: DashboardAction[];
  hasActiveCycle: boolean;
  today?: Date;
}): DashboardAction {
  if (!params.hasActiveCycle) {
    return {
      id: 'load-cycle',
      kind: 'load_cycle',
      tone: 'info',
      title: 'Carregue um edital no ciclo',
      description: 'O painel precisa de um ciclo ativo para calcular sua fila real.',
      reason: 'Sem ciclo ativo, não existe ordem confiável de estudo.',
      primaryLabel: 'Ir para Meus Editais',
      primaryHref: '/meus-editais',
      secondaryLabel: 'Meus editais',
      secondaryHref: '/meus-editais',
      target: {},
      priorityScore: 0,
    };
  }

  if (params.overdueReviews.length > 0) return reviewAction(params.overdueReviews[0], 'review_overdue', params.today);
  if (params.todayReviews.length > 0) return reviewAction(params.todayReviews[0], 'review_today', params.today);
  if (params.cycleActions.length > 0) return params.cycleActions[0];
  if (params.strategicActions.length > 0) return params.strategicActions[0];

  return {
    id: 'all-caught-up',
    kind: 'all_caught_up',
    tone: 'success',
    title: 'Tudo em dia',
    description: 'Sem revisões urgentes e sem tópicos pendentes no ciclo.',
    reason: 'Quando não há atraso, o melhor movimento é manter constância e preparar o próximo bloco.',
    scientificBasis: 'Consistência reduz acumulação futura e preserva energia cognitiva.',
    primaryLabel: 'Ver ciclo',
    primaryHref: '/ciclo-estudos',
    secondaryLabel: 'Ver revisoes',
    secondaryHref: '/revisoes',
    target: {},
    priorityScore: 10,
  };
}

export function buildActionQueue(params: {
  overdueReviews: DashboardReviewTopic[];
  todayReviews: DashboardReviewTopic[];
  cycleActions: DashboardAction[];
  strategicActions: DashboardAction[];
  limit?: number;
  today?: Date;
}): DashboardAction[] {
  const reviewActions = [
    ...params.overdueReviews.map((topic) => reviewAction(topic, 'review_overdue', params.today)),
    ...params.todayReviews.map((topic) => reviewAction(topic, 'review_today', params.today)),
  ];

  const actions = [...reviewActions, ...params.cycleActions, ...params.strategicActions];
  const seen = new Set<string>();

  return actions
    .filter((action) => {
      const key = action.target.topicId ? `topic:${action.target.topicId}` : action.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, params.limit ?? 4);
}

export function buildDashboardPace(params: {
  examDate: string | null;
  today?: Date;
  totalUnstartedTopics: number;
  overdueReviews: number;
  todayReviews: number;
  futureReviewsInWindow: number;
  totalPlannedReviews?: number;
  hasActiveCycle: boolean;
}): DashboardPace {
  return buildStudyCyclePaceMetrics({
    examDate: params.examDate,
    today: params.today,
    unstartedTopics: params.totalUnstartedTopics,
    overdueReviews: params.overdueReviews,
    dueTodayReviews: params.todayReviews,
    futureReviewsInWindow: params.futureReviewsInWindow,
    totalPlannedReviews: params.totalPlannedReviews,
    hasActiveCycle: params.hasActiveCycle,
  });
}

export function buildProgressSummary(subjects: DashboardCycleSubject[]): DashboardProgressSummary {
  const topics = subjects.flatMap((subject) => subject.topics);
  const completedTopics = topics.filter((topic) => topic.completed).length;
  const startedTopics = topics.filter((topic) => topic.completed || isTopicStarted(topic)).length;
  const inProgressTopics = topics.filter((topic) => !topic.completed && isTopicStarted(topic)).length;
  const totalTopics = topics.length;

  return {
    startedTopics,
    inProgressTopics,
    completedTopics,
    totalTopics,
    editalProgressPercentage: totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0,
  };
}
