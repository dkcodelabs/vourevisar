import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type {
  ChargeCoverageState,
  DashboardAction,
  DashboardActivityDay,
  DashboardCycleSubject,
  DashboardCycleTopic,
  DashboardChargeSummary,
  DashboardDifficultySummary,
  DashboardPace,
  DashboardProgressSummary,
  DashboardReviewTopic,
} from '@/types/dashboardDecision';

export function normalizeReminderDate(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 10);
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

export function getDashboardActivitySelection(days: DashboardActivityDay[], selectedDate?: string | null) {
  if (selectedDate === null) {
    return {
      day: null,
      studies: [],
      reviews: [],
    };
  }

  const selectedDay = selectedDate ? days.find((day) => day.date === selectedDate) : null;
  const day =
    selectedDay ??
    days.at(-1) ??
    null;
  const entries = day?.entries ?? [];

  return {
    day,
    studies: entries.filter((entry) => entry.type === 'study'),
    reviews: entries.filter((entry) => entry.type === 'review'),
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
  const sortedSubjects = [...subjects].sort((a, b) => a.cyclePosition - b.cyclePosition);
  const actions: DashboardAction[] = [];

  for (const subject of sortedSubjects) {
    if (subject.isCompletedInCycle) continue;

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
        ? 'Respeita a ordem que você definiu no Ciclo de Estudos.'
        : 'Mantém continuidade no ciclo sem trocar sua ordem.',
      scientificBasis: startsNewTopic
        ? 'Primeiro contato organizado reduz troca de contexto e mantém progresso incremental.'
        : 'Continuar um tópico já iniciado diminui perda de contexto antes de abrir novo conteúdo.',
      primaryLabel: startsNewTopic ? 'Iniciar estudo' : 'Continuar estudo',
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
      metadata: {
        reviewCount: topic.reviewCount ?? 0,
        totalVolume: topic.totalVolume ?? null,
      },
    });

    if (actions.length >= limit) break;
  }

  return actions;
}

export function getChargeCoverageState(subjects: DashboardCycleSubject[]): ChargeCoverageState {
  const topics = subjects.flatMap((subject) => subject.topics);
  if (topics.length === 0) return 'none';

  const analyzed = topics.filter(
    (topic) => topic.incidenceLevel === 'low' || topic.incidenceLevel === 'medium' || topic.incidenceLevel === 'high',
  ).length;
  if (analyzed === 0) return 'none';

  const coverage = analyzed / topics.length;
  return coverage >= 0.7 ? 'sufficient' : 'partial';
}

export function getChargeSummary(
  subjects: DashboardCycleSubject[],
  today = new Date(),
): DashboardChargeSummary {
  const topics = subjects.flatMap((subject) => subject.topics);
  const analyzedTopics = topics.filter(
    (topic) => topic.incidenceLevel === 'low' || topic.incidenceLevel === 'medium' || topic.incidenceLevel === 'high',
  );
  const highTopics = analyzedTopics.filter((topic) => topic.incidenceLevel === 'high');
  const todayKey = dayKey(today);
  const isOverdue = (topic: DashboardCycleTopic) => {
    if (!topic.nextReview || topic.completed || !isTopicStarted(topic)) return false;
    const dueDate = new Date(topic.nextReview);
    if (Number.isNaN(dueDate.getTime())) return false;
    return dayKey(dueDate) < todayKey;
  };
  const highOverdueTopics = highTopics.filter(isOverdue);
  const highUnstartedTopics = highTopics.filter((topic) => !topic.completed && !isTopicStarted(topic));
  const highInReviewTopics = highTopics.filter(
    (topic) => !topic.completed && isTopicStarted(topic) && !isOverdue(topic),
  );

  return {
    low: analyzedTopics.filter((topic) => topic.incidenceLevel === 'low').length,
    medium: analyzedTopics.filter((topic) => topic.incidenceLevel === 'medium').length,
    high: highTopics.length,
    analyzedTopics: analyzedTopics.length,
    totalTopics: topics.length,
    unanalyzedTopics: Math.max(0, topics.length - analyzedTopics.length),
    highOverdue: {
      count: highOverdueTopics.length,
      topicId: highOverdueTopics[0]?.id ?? null,
    },
    highUnstarted: {
      count: highUnstartedTopics.length,
      topicId: highUnstartedTopics[0]?.id ?? null,
    },
    highInReview: {
      count: highInReviewTopics.length,
      topicId: highInReviewTopics[0]?.id ?? null,
    },
  };
}

export function getStrategicHighChargeActions(subjects: DashboardCycleSubject[], limit = 2): DashboardAction[] {
  const coverage = getChargeCoverageState(subjects);
  if (coverage === 'none') return [];

  return subjects
    .flatMap((subject) =>
      subject.topics
        .filter((topic) => !topic.completed && !isTopicStarted(topic) && topic.incidenceLevel === 'high')
        .map((topic) => ({
          subject,
          topic,
          volume: topic.totalVolume || 0,
        })),
    )
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
    .map(({ subject, topic, volume }) => ({
      id: `charge:${topic.id}`,
      kind: 'strategic_high_charge',
      tone: 'warning',
      title: `Alta cobrança: ${topic.name}`,
      description: `${subject.name} • ainda sem primeiro contato`,
      reason:
        coverage === 'partial'
          ? 'Este tópico aparece forte entre os itens já analisados. Use como alerta, sem ignorar a ordem do ciclo.'
          : 'Este tópico tem sinal de alta cobrança no edital analisado.',
      scientificBasis: 'Priorizar incidência só é confiável quando existe dado processado; por isso aparece como alerta estratégico.',
      primaryLabel: 'Ver no ciclo',
      primaryHref: '/ciclo-estudos',
      secondaryLabel: 'Abrir tópico',
      secondaryHref: `/revisoes?topicId=${topic.id}`,
      target: {
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
      },
      priorityScore: 40,
      metadata: {
        totalVolume: volume,
      },
    }));
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
  hasActiveCycle: boolean;
}): DashboardPace {
  if (!params.hasActiveCycle) {
    return {
      state: 'missing_cycle',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: params.totalUnstartedTopics,
      pendingReviews: params.overdueReviews + params.todayReviews + params.futureReviewsInWindow,
      futureReviewsInWindow: params.futureReviewsInWindow,
      explanation: 'Carregue um ciclo para calcular ritmo.',
    };
  }

  if (!params.examDate) {
    return {
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: params.totalUnstartedTopics,
      pendingReviews: params.overdueReviews + params.todayReviews + params.futureReviewsInWindow,
      futureReviewsInWindow: params.futureReviewsInWindow,
      explanation: 'Defina uma data de prova para calcular o ritmo necessário.',
    };
  }

  const today = params.today ?? new Date();
  const examDate = params.examDate.length === 10 ? parseISO(params.examDate) : new Date(params.examDate);
  const daysRemaining = differenceInCalendarDays(startOfDay(examDate), startOfDay(today));

  if (daysRemaining < 0) {
    return {
      state: 'exam_date_past',
      daysRemaining,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: params.totalUnstartedTopics,
      pendingReviews: params.overdueReviews + params.todayReviews + params.futureReviewsInWindow,
      futureReviewsInWindow: params.futureReviewsInWindow,
      explanation: 'A data da prova já passou. Atualize a data para recalcular o ritmo.',
    };
  }

  const divisor = Math.max(daysRemaining, 1);
  const pendingReviews = params.overdueReviews + params.todayReviews + params.futureReviewsInWindow;

  return {
    state: 'ready',
    daysRemaining,
    newTopicsPerDay: params.totalUnstartedTopics / divisor,
    reviewsPerDay: pendingReviews / divisor,
    unstartedTopics: params.totalUnstartedTopics,
    pendingReviews,
    futureReviewsInWindow: params.futureReviewsInWindow,
    explanation: 'Cálculo baseado nos tópicos não iniciados, revisões pendentes e revisões futuras até a prova.',
  };
}

export function getDifficultySummary(subjects: DashboardCycleSubject[]): DashboardDifficultySummary {
  return subjects
    .flatMap((subject) => subject.topics)
    .reduce<DashboardDifficultySummary>(
      (acc, topic) => {
        if (topic.difficultyLevel === 1) acc.easy += 1;
        else if (topic.difficultyLevel === 2) acc.medium += 1;
        else if (topic.difficultyLevel === 3) acc.hard += 1;
        else return acc;

        acc.totalRated += 1;
        return acc;
      },
      { easy: 0, medium: 0, hard: 0, totalRated: 0 },
    );
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
