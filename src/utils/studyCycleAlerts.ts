import {
  getExamWeightTotals,
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightPercentage,
  hasSubjectExamWeight,
} from '@/utils/examWeight';

type AlertTopic = {
  id: string;
  name: string;
  completed?: boolean;
  is_completed?: boolean;
  reviewCount?: number;
  review_count?: number;
  reviewStage?: string | null;
  review_stage?: string | null;
  firstStudiedAt?: Date | string | null;
  first_studied_at?: string | null;
  total_volume?: number | null;
  is_active?: boolean;
};

type AlertSubject = {
  id: string;
  name: string;
  topics: AlertTopic[];
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
  exam_weight_raw?: string | null;
};

type AlertEdital = {
  id: string;
  name: string;
  exam_date?: string | null;
  examDate?: string | null;
  subject_ids?: string[];
  subjectIds?: string[];
};

export type StudyCycleAlertSeverity = 'critical' | 'warning' | 'info';

export type StudyCycleAlertActionType =
  | 'start_topic'
  | 'fill_weight'
  | 'review_cycle'
  | 'open_edital'
  | 'none';

export type StudyCycleAlert = {
  id: string;
  severity: StudyCycleAlertSeverity;
  title: string;
  message: string;
  evidence: string;
  actionLabel?: string;
  actionType: StudyCycleAlertActionType;
  subjectId?: string;
  topicId?: string;
};

type GetStudyCycleAlertsInput = {
  subjects: AlertSubject[];
  editais?: AlertEdital[];
  hasCycleHistory?: boolean;
  now?: Date;
  maxAlerts?: number;
};

const isTopicCompleted = (topic: AlertTopic) =>
  topic.completed === true ||
  topic.is_completed === true ||
  topic.reviewStage === 'Concluído' ||
  topic.review_stage === 'Concluído';

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const isTopicStarted = (topic: AlertTopic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  isTopicCompleted(topic);

const activeTopics = (subject: AlertSubject) =>
  subject.topics.filter(topic => topic.is_active !== false);

const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const formatKnownWeightShare = (value: number) =>
  `${formatPercent(value)} entre as matérias com peso informado.`;

const getDaysUntil = (dateValue: string | null | undefined, now: Date) => {
  if (!dateValue) return null;

  const examTime = new Date(dateValue).getTime();
  if (!Number.isFinite(examTime)) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return Math.ceil((examTime - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getSubjectStartedRatio = (subject: AlertSubject) => {
  const topics = activeTopics(subject);
  if (topics.length === 0) return null;

  const started = topics.filter(isTopicStarted).length;
  return {
    total: topics.length,
    started,
    ratio: started / topics.length,
  };
};

export const getStudyCycleAlerts = ({
  subjects,
  editais = [],
  hasCycleHistory = true,
  now = new Date(),
  maxAlerts = 4,
}: GetStudyCycleAlertsInput): StudyCycleAlert[] => {
  const alerts: StudyCycleAlert[] = [];
  const weightTotals = getExamWeightTotals(subjects);
  const weightedSubjects = subjects
    .filter(hasSubjectExamWeight)
    .map(subject => ({
      subject,
      effectiveWeight: getEffectiveSubjectExamWeight(subject),
      percentage: getSubjectExamWeightPercentage(subject, weightTotals),
      progress: getSubjectStartedRatio(subject),
    }))
    .filter(item => item.progress && item.progress.total > 0);

  const unopenedWeightedSubject = weightedSubjects
    .filter(item => item.progress?.started === 0)
    .sort((a, b) => b.effectiveWeight.value - a.effectiveWeight.value)[0];

  if (unopenedWeightedSubject) {
    const { subject, effectiveWeight, percentage } = unopenedWeightedSubject;
    alerts.push({
      id: `weighted-subject-unstarted:${subject.id}`,
      severity: percentage !== null && percentage >= 15 ? 'critical' : 'warning',
      title: 'Matéria importante parada',
      message: `${subject.name} tem peso informado, mas ainda não teve primeiro contato.`,
      evidence: percentage !== null
        ? formatKnownWeightShare(percentage)
        : `${effectiveWeight.value} ${effectiveWeight.label}.`,
      actionLabel: 'Iniciar matéria',
      actionType: 'start_topic',
      subjectId: subject.id,
    });
  }

  const lowProgressWeightedSubject = weightedSubjects
    .filter(item => item.progress && item.progress.started > 0 && item.progress.ratio < 0.25)
    .sort((a, b) => b.effectiveWeight.value - a.effectiveWeight.value)[0];

  if (lowProgressWeightedSubject && !alerts.some(alert => alert.subjectId === lowProgressWeightedSubject.subject.id)) {
    const { subject, progress, percentage } = lowProgressWeightedSubject;
    alerts.push({
      id: `weighted-subject-low-progress:${subject.id}`,
      severity: 'warning',
      title: 'Matéria importante pouco aberta',
      message: `${subject.name} tem peso conhecido, mas começou só ${progress?.started}/${progress?.total} tópicos.`,
      evidence: percentage !== null
        ? formatKnownWeightShare(percentage)
        : 'Peso informado no edital.',
      actionLabel: 'Ver matéria',
      actionType: 'review_cycle',
      subjectId: subject.id,
    });
  }

  const relevantUnstartedTopics = subjects
    .flatMap(subject => activeTopics(subject)
      .filter(topic => !isTopicStarted(topic) && typeof topic.total_volume === 'number' && topic.total_volume > 0)
      .map(topic => ({
        subject,
        topic,
        volume: topic.total_volume || 0,
      })))
    .sort((a, b) => b.volume - a.volume);

  if (relevantUnstartedTopics.length > 0) {
    const top = relevantUnstartedTopics[0];
    alerts.push({
      id: `high-volume-topic-unstarted:${top.topic.id}`,
      severity: 'warning',
      title: 'Tópico forte ainda não iniciado',
      message: `${top.topic.name} aparece com cobrança alta e ainda não teve primeiro contato.`,
      evidence: `Matéria: ${top.subject.name}.`,
      actionLabel: 'Iniciar tópico',
      actionType: 'start_topic',
      subjectId: top.subject.id,
      topicId: top.topic.id,
    });
  }

  const nearestExam = editais
    .map(edital => ({
      edital,
      daysUntil: getDaysUntil(edital.exam_date || edital.examDate || null, now),
    }))
    .filter((item): item is { edital: AlertEdital; daysUntil: number } =>
      item.daysUntil !== null && item.daysUntil >= 0
    )
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];

  if (nearestExam && nearestExam.daysUntil <= 60 && relevantUnstartedTopics.length > 0) {
    const top = relevantUnstartedTopics[0];
    alerts.push({
      id: `exam-near-open-relevant-topic:${nearestExam.edital.id}:${top.topic.id}`,
      severity: nearestExam.daysUntil <= 30 ? 'critical' : 'warning',
      title: 'Prova chegando com tópico relevante aberto',
      message: `${nearestExam.edital.name} está a ${nearestExam.daysUntil} dia${nearestExam.daysUntil === 1 ? '' : 's'} e ainda há tópico cobrado sem início.`,
      evidence: `${top.topic.name} · matéria: ${top.subject.name}.`,
      actionLabel: 'Priorizar agora',
      actionType: 'start_topic',
      subjectId: top.subject.id,
      topicId: top.topic.id,
    });
  }

  const severityWeight: Record<StudyCycleAlertSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return alerts
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    .filter((alert, index, list) =>
      list.findIndex(item => item.id === alert.id) === index
    )
    .slice(0, maxAlerts);
};
