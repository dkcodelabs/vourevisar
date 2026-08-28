import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSubjectExamWeightLabel, hasSubjectExamWeight } from '@/utils/examWeight';
import { determineLearningStatus } from '@/utils/learningStatus';
import type {
  BuildCycleStatisticsInput,
  CycleStatisticsData,
  CycleStatisticsInsight,
  CycleStatisticsPeriod,
  CycleStatisticsSessionInput,
  CycleStatisticsSubject,
  CycleStatisticsTopicInput,
} from '@/types/cycleStatistics';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getCycleStatisticsPeriodStart = (
  period: CycleStatisticsPeriod,
  now: Date = new Date(),
) => period === 'all' ? null : format(subDays(now, period - 1), 'yyyy-MM-dd');

export const getCycleStatisticsQueryStart = (
  period: CycleStatisticsPeriod,
  now: Date = new Date(),
) => period === 'all' ? null : format(subDays(now, period * 2 - 1), 'yyyy-MM-dd');

const toDateKey = (value: Date) => format(value, 'yyyy-MM-dd');

const parseDateKey = (value: string) => {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isStarted = (topic: CycleStatisticsTopicInput) =>
  Boolean(topic.firstStudiedAt) || topic.completed;

const getValidSessions = (sessions: CycleStatisticsSessionInput[]) => {
  const uniqueSessions = new Map<string, CycleStatisticsSessionInput>();
  sessions.forEach(session => {
    if (
      DATE_KEY_PATTERN.test(session.studyDate) &&
      Number.isFinite(session.durationMinutes) &&
      session.durationMinutes > 0
    ) {
      uniqueSessions.set(session.id, session);
    }
  });
  return [...uniqueSessions.values()];
};

const sumMinutes = (sessions: CycleStatisticsSessionInput[]) =>
  sessions.reduce((total, session) => total + session.durationMinutes, 0);

const buildCurrentStreak = (activeDateKeys: Set<string>, now: Date) => {
  if (activeDateKeys.size === 0) return 0;

  let cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!activeDateKeys.has(toDateKey(cursor))) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  while (activeDateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
};

const buildBestStreak = (activeDateKeys: Set<string>) => {
  const sortedKeys = [...activeDateKeys].sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  sortedKeys.forEach(key => {
    const date = parseDateKey(key);
    if (!date) return;
    current = previous && differenceInCalendarDays(date, previous) === 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = date;
  });

  return best;
};

const getDateState = (dateValue: string | null, todayKey: string) => {
  if (!dateValue) return 'unscheduled' as const;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'unscheduled' as const;
  const key = toDateKey(parsed);
  if (key < todayKey) return 'overdue' as const;
  if (key === todayKey) return 'today' as const;
  return 'future' as const;
};

const buildInsight = (
  progress: CycleStatisticsData['progress'],
  memory: CycleStatisticsData['memory'],
  subjects: CycleStatisticsSubject[],
  time: CycleStatisticsData['time'],
): CycleStatisticsInsight => {
  if (memory.overdue > 0) {
    const subject = [...subjects]
      .filter(item => item.overdueReviews > 0)
      .sort((left, right) => right.overdueReviews - left.overdueReviews)[0];

    return {
      id: 'overdue-reviews',
      tone: 'critical',
      title: 'Proteja o que você já construiu',
      description: subject
        ? `${subject.name} concentra a maior parte das revisões vencidas do ciclo.`
        : 'Há revisões vencidas no ciclo ativo e elas são o ponto mais urgente agora.',
      evidence: `${memory.overdue} ${memory.overdue === 1 ? 'revisão vencida' : 'revisões vencidas'} no ciclo ativo.`,
      actionLabel: 'Revisar agora',
      actionHref: '/revisoes',
      focusSubjectId: subject?.id,
    };
  }

  if (progress.started === 0) {
    return {
      id: 'first-contact',
      tone: 'neutral',
      title: 'Seu mapa começa no primeiro contato',
      description: 'O ciclo está pronto, mas ainda não há tópico iniciado para formar uma leitura de evolução.',
      evidence: `${progress.total} ${progress.total === 1 ? 'tópico disponível' : 'tópicos disponíveis'} no ciclo.`,
      actionLabel: 'Iniciar ciclo',
      actionHref: '/ciclo-estudos',
    };
  }

  if (time.activeDays === 0) {
    return {
      id: 'no-recent-time',
      tone: 'attention',
      title: 'O avanço perdeu continuidade recente',
      description: 'Há conteúdo iniciado, mas nenhum minuto válido foi registrado no período selecionado.',
      evidence: `${progress.started} ${progress.started === 1 ? 'tópico iniciado' : 'tópicos iniciados'} sem tempo recente no cronômetro.`,
      actionLabel: 'Continuar ciclo',
      actionHref: '/ciclo-estudos',
    };
  }

  if (progress.notStarted > 0) {
    return {
      id: 'expand-coverage',
      tone: 'positive',
      title: 'Seu próximo ganho está em ampliar a cobertura',
      description: 'As revisões estão em dia. Continue abrindo o edital sem abandonar o ritmo já construído.',
      evidence: `${progress.notStarted} ${progress.notStarted === 1 ? 'tópico ainda não iniciado' : 'tópicos ainda não iniciados'}.`,
      actionLabel: 'Continuar ciclo',
      actionHref: '/ciclo-estudos',
    };
  }

  if (progress.completed < progress.total) {
    return {
      id: 'finish-reviews',
      tone: 'positive',
      title: 'A cobertura está completa; agora é consolidação',
      description: 'Todo o edital ativo já recebeu primeiro contato. O ganho agora vem de concluir as revisões programadas.',
      evidence: `${progress.inDevelopment} ${progress.inDevelopment === 1 ? 'tópico em desenvolvimento' : 'tópicos em desenvolvimento'}.`,
      actionLabel: 'Ver revisões',
      actionHref: '/revisoes',
    };
  }

  return {
    id: 'cycle-consolidated',
    tone: 'positive',
    title: 'O ciclo ativo está consolidado',
    description: 'Todos os tópicos visíveis concluíram o programa automático de revisões.',
    evidence: `${progress.completed} ${progress.completed === 1 ? 'tópico consolidado' : 'tópicos consolidados'}.`,
    actionLabel: 'Ver ciclo',
    actionHref: '/ciclo-estudos',
  };
};

export function buildCycleStatistics({
  cycle,
  editalNames,
  period,
  topics,
  subjects,
  sessions,
  now = new Date(),
}: BuildCycleStatisticsInput): CycleStatisticsData {
  const todayKey = toDateKey(now);
  const currentStartKey = getCycleStatisticsPeriodStart(period, now);
  const validSessions = getValidSessions(sessions);
  const cycleStart = cycle.startedAt ? new Date(cycle.startedAt) : null;
  const earliestSession = validSessions
    .map(session => parseDateKey(session.studyDate))
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
  const allCycleStart = cycleStart && Number.isFinite(cycleStart.getTime())
    ? cycleStart
    : earliestSession ?? now;
  const periodDays = period === 'all'
    ? Math.max(1, differenceInCalendarDays(now, allCycleStart) + 1)
    : period;
  const currentSessions = validSessions.filter(session => (
    (!currentStartKey || session.studyDate >= currentStartKey) && session.studyDate <= todayKey
  ));
  const previousSessions = period === 'all' ? [] : validSessions.filter(session => {
    const previousStartKey = format(subDays(now, period * 2 - 1), 'yyyy-MM-dd');
    const previousEndKey = format(subDays(now, period), 'yyyy-MM-dd');
    return session.studyDate >= previousStartKey && session.studyDate <= previousEndKey;
  });

  const completedTopics = topics.filter(topic => topic.completed);
  const startedTopics = topics.filter(isStarted);
  const inDevelopmentTopics = startedTopics.filter(topic => !topic.completed);
  const progress = {
    total: topics.length,
    notStarted: Math.max(0, topics.length - startedTopics.length),
    started: startedTopics.length,
    inDevelopment: inDevelopmentTopics.length,
    completed: completedTopics.length,
    coveragePercentage: topics.length > 0 ? Math.round((startedTopics.length / topics.length) * 100) : 0,
    completionPercentage: topics.length > 0 ? Math.round((completedTopics.length / topics.length) * 100) : 0,
  };

  const reviewableTopics = startedTopics.filter(topic => !topic.completed);
  const memory = reviewableTopics.reduce<CycleStatisticsData['memory']>((result, topic) => {
    const status = topic.learningStatus ?? determineLearningStatus(
      topic.memoryStability ?? 0,
      topic.currentInterval ?? 0,
      topic.reviewCount,
    );
    if (status === 'Aprendendo') result.learning += 1;
    if (status === 'Fixando') result.fixing += 1;
    if (status === 'Dominando') result.mastering += 1;

    const dateState = getDateState(topic.nextReview, todayKey);
    if (dateState === 'overdue') result.overdue += 1;
    if (dateState === 'today') result.dueToday += 1;
    if (dateState === 'future') result.future += 1;
    if (dateState === 'unscheduled') result.unscheduled += 1;
    result.eligible += 1;
    return result;
  }, {
    eligible: completedTopics.length,
    learning: 0,
    fixing: 0,
    mastering: completedTopics.length,
    overdue: 0,
    dueToday: 0,
    future: 0,
    unscheduled: 0,
  });

  const currentMinutes = sumMinutes(currentSessions);
  const previousMinutes = sumMinutes(previousSessions);
  const minutesByDate = new Map<string, number>();
  currentSessions.forEach(session => {
    minutesByDate.set(session.studyDate, (minutesByDate.get(session.studyDate) ?? 0) + session.durationMinutes);
  });

  const daily = Array.from({ length: periodDays }, (_, index) => {
    const date = subDays(now, periodDays - 1 - index);
    const dateKey = toDateKey(date);
    const minutes = minutesByDate.get(dateKey) ?? 0;
    return {
      date: dateKey,
      label: format(date, period === 7 ? 'EEE' : 'dd/MM', { locale: ptBR }).replace('.', ''),
      minutes,
      isActive: minutes >= 1,
    };
  });
  const activeDateKeys = new Set(daily.filter(day => day.isActive).map(day => day.date));
  const activeDays = activeDateKeys.size;
  const time = {
    totalMinutes: currentMinutes,
    averagePerActiveDay: activeDays > 0 ? Math.round(currentMinutes / activeDays) : 0,
    activeDays,
    periodDays,
    currentStreak: buildCurrentStreak(activeDateKeys, now),
    bestStreak: buildBestStreak(activeDateKeys),
    isAllCycle: period === 'all',
    previousPeriodMinutes: previousMinutes,
    comparisonPercentage: previousMinutes > 0
      ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100)
      : null,
    daily,
  };

  const topicBySubject = new Map<string, CycleStatisticsTopicInput[]>();
  topics.forEach(topic => {
    topicBySubject.set(topic.subjectId, [...(topicBySubject.get(topic.subjectId) ?? []), topic]);
  });
  const minutesBySubject = new Map<string, number>();
  currentSessions.forEach(session => {
    if (!session.subjectId) return;
    minutesBySubject.set(
      session.subjectId,
      (minutesBySubject.get(session.subjectId) ?? 0) + session.durationMinutes,
    );
  });

  const subjectStatistics = subjects.map<CycleStatisticsSubject>(subject => {
    const subjectTopics = topicBySubject.get(subject.id) ?? [];
    const subjectStarted = subjectTopics.filter(isStarted).length;
    const subjectCompleted = subjectTopics.filter(topic => topic.completed).length;
    const overdueReviews = subjectTopics.filter(topic => (
      isStarted(topic) && !topic.completed && getDateState(topic.nextReview, todayKey) === 'overdue'
    )).length;
    const weightSource = {
      exam_weight_points: subject.examWeightPoints,
      exam_weight_questions: subject.examWeightQuestions,
      exam_weight_percentage: subject.examWeightPercentage,
      exam_weight_raw: subject.examWeightRaw,
    };
    return {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      totalTopics: subjectTopics.length,
      startedTopics: subjectStarted,
      completedTopics: subjectCompleted,
      overdueReviews,
      studyMinutes: minutesBySubject.get(subject.id) ?? 0,
      coveragePercentage: subjectTopics.length > 0
        ? Math.round((subjectStarted / subjectTopics.length) * 100)
        : 0,
      weightLabel: getSubjectExamWeightLabel(weightSource),
      hasWeight: hasSubjectExamWeight(weightSource),
    };
  }).sort((left, right) => {
    if (right.overdueReviews !== left.overdueReviews) return right.overdueReviews - left.overdueReviews;
    if (right.studyMinutes !== left.studyMinutes) return right.studyMinutes - left.studyMinutes;
    return right.coveragePercentage - left.coveragePercentage;
  });

  return {
    cycleId: cycle.id,
    cycleName: cycle.name?.trim() || 'Ciclo de estudos',
    editalLabel: editalNames.length > 0 ? editalNames.join(' + ') : 'Edital do ciclo ativo',
    examDate: cycle.examDate,
    combinedEditaisCount: editalNames.length,
    progress,
    memory,
    time,
    subjects: subjectStatistics,
    insight: buildInsight(progress, memory, subjectStatistics, time),
    hasStudyTime: currentMinutes > 0,
  };
}

export function formatStudyMinutes(minutes: number) {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}

export function getDateLabel(value: string | null) {
  if (!value) return null;
  const parsed = DATE_KEY_PATTERN.test(value) ? parseDateKey(value) : new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}
