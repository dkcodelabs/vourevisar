import {
  getExamWeightTotals,
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightPercentage,
  hasSubjectExamWeight,
} from '@/utils/examWeight';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { getVisibleCycleTopics } from '@/utils/studyCycleTopicVisibility';

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
  is_active?: boolean;
  is_hidden?: boolean | null;
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
  | 'start_subject'
  | 'start_topic'
  | 'fill_weight'
  | 'review_cycle'
  | 'edit_cycle_exam_date'
  | 'open_edital'
  | 'open_reviews'
  | 'none';

export type StudyCycleAlert = {
  id: string;
  severity: StudyCycleAlertSeverity;
  title: string;
  message: string;
  evidence: string;
  subjectName?: string;
  actionLabel?: string;
  actionType: StudyCycleAlertActionType;
  subjectId?: string;
  topicId?: string;
};

type GetStudyCycleAlertsInput = {
  subjects: AlertSubject[];
  cycleExamDate?: string | null;
  editais?: AlertEdital[];
  hasCycleHistory?: boolean;
  now?: Date;
  maxAlerts?: number;
};

const isTopicCompleted = (topic: AlertTopic) =>
  isReviewProgramCompleted(topic);

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

const isTopicUnreviewedAfterFirstContact = (topic: AlertTopic, now: Date) => {
  if (isTopicCompleted(topic)) return false;
  const reviewCount = (topic.reviewCount ?? topic.review_count ?? 0);
  if (reviewCount > 0) return false;

  const firstDateRaw = topic.first_studied_at || topic.firstStudiedAt;
  if (!firstDateRaw) return false;

  const firstDate = parseDateValue(typeof firstDateRaw === 'string' ? firstDateRaw : firstDateRaw.toISOString());
  if (!firstDate) return false;

  const hoursSinceFirstContact = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceFirstContact >= 48;
};

const activeTopics = (subject: AlertSubject) =>
  getVisibleCycleTopics(subject.topics);

const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const formatKnownWeightShare = (value: number) =>
  `${formatPercent(value)} entre as matérias com peso informado.`;

const parseDateValue = (dateValue: string | null | undefined) => {
  if (!dateValue) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T00:00:00`)
    : new Date(dateValue);

  return Number.isFinite(date.getTime()) ? date : null;
};

const formatExamDate = (dateValue: string | null | undefined) => {
  const date = parseDateValue(dateValue);
  if (!date) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDaysUntilExam = (daysUntil: number) => {
  if (daysUntil === 0) return 'hoje';
  if (daysUntil === 1) return 'amanhã';
  return `em ${daysUntil} dias`;
};

const getDaysUntil = (dateValue: string | null | undefined, now: Date) => {
  const examDate = parseDateValue(dateValue);
  if (!examDate) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
  cycleExamDate = null,
  editais = [],
  hasCycleHistory = true,
  now = new Date(),
  maxAlerts = 4,
}: GetStudyCycleAlertsInput): StudyCycleAlert[] => {
  const alerts: StudyCycleAlert[] = [];
  const cycleDaysUntilExam = getDaysUntil(cycleExamDate, now);

  if (cycleDaysUntilExam !== null && cycleDaysUntilExam < 0) {
    const cycleExamDateLabel = formatExamDate(cycleExamDate);
    alerts.push({
      id: 'cycle-exam-date-past',
      severity: 'critical',
      title: 'Data da prova vencida',
      message: 'A data do ciclo já passou. Atualize a prova para recalcular ritmo e prioridades.',
      evidence: cycleExamDateLabel ? `Data atual do ciclo: ${cycleExamDateLabel}.` : 'Data atual do ciclo inválida.',
      actionLabel: 'Atualizar data',
      actionType: 'edit_cycle_exam_date',
    });
  }

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

  const unopenedWeightedSubjects = weightedSubjects
    .filter(item => item.progress?.started === 0)
    .sort((a, b) => b.effectiveWeight.value - a.effectiveWeight.value)
    .slice(0, 3);

  unopenedWeightedSubjects.forEach(({ subject, effectiveWeight, percentage }) => {
    alerts.push({
      id: `weighted-subject-unstarted:${subject.id}`,
      severity: percentage !== null && percentage >= 15 ? 'critical' : 'warning',
      title: 'Matéria importante parada',
      message: `${subject.name} tem peso informado, mas ainda não teve primeiro contato.`,
      evidence: percentage !== null
        ? formatKnownWeightShare(percentage)
        : `${effectiveWeight.value} ${effectiveWeight.label}.`,
      subjectName: subject.name,
      actionLabel: 'Iniciar matéria',
      actionType: 'start_subject',
      subjectId: subject.id,
    });
  });

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

  const unreviewedImportantTopics = subjects
    .flatMap(subject => activeTopics(subject)
      .flatMap(topic => {
        if (!isTopicUnreviewedAfterFirstContact(topic, now)) return [];

        const isWeightedSubject = hasSubjectExamWeight(subject);

        if (isWeightedSubject) {
          return [{
            subject,
            topic,
          }];
        }

        return [];
      })
    );

  if (unreviewedImportantTopics.length > 0) {
    const top = unreviewedImportantTopics[0];
    alerts.push({
      id: `unreviewed-important-topic:${top.topic.id}`,
      severity: 'warning',
      title: 'Tópico importante sem revisão',
      message: `${top.topic.name} já teve 1º contato, mas ainda não foi revisado.`,
      evidence: `Matéria: ${top.subject.name} · peso informado no edital.`,
      actionLabel: 'Ver revisões',
      actionType: 'open_reviews',
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
