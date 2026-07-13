import { isReviewProgramCompleted } from '@/utils/reviewStage';

export type StudyCycleSubjectActionState =
  | { kind: 'locked_completed'; tooltip: string }
  | { kind: 'locked_started'; tooltip: string }
  | { kind: 'return_to_queue'; tooltip: string }
  | { kind: 'mark_studied'; tooltip: string };

export type StudyCycleSubjectTopicState = {
  first_studied_at?: string | Date | null;
  firstStudiedAt?: string | Date | null;
  completed?: boolean | null;
  is_completed?: boolean | null;
  reviewCount?: number | null;
  review_count?: number | null;
  reviewStage?: string | null;
  review_stage?: string | null;
  is_active?: boolean | null;
  is_hidden?: boolean | null;
};

type SubjectActionInput = {
  isCompletedInEdital: boolean;
  isFullyStartedInCycle: boolean;
  isManuallyStudiedInCycle: boolean;
  needsCycleClosure?: boolean;
};

const isVisibleCycleTopic = (topic: StudyCycleSubjectTopicState) =>
  topic.is_active !== false && topic.is_hidden !== true;

const isTopicCompleted = (topic: StudyCycleSubjectTopicState) =>
  isReviewProgramCompleted(topic);

const getTopicFirstStudyDate = (topic: StudyCycleSubjectTopicState) =>
  topic.first_studied_at || topic.firstStudiedAt;

export const isTopicStartedInCycle = (
  topic: StudyCycleSubjectTopicState,
  cycleStart?: string | Date | null,
) => {
  if (!cycleStart) return false;

  const firstStudiedAt = getTopicFirstStudyDate(topic);
  if (!firstStudiedAt) return false;

  const firstStudiedTime = new Date(firstStudiedAt).getTime();
  const cycleStartTime = new Date(cycleStart).getTime();

  return Number.isFinite(firstStudiedTime) &&
    Number.isFinite(cycleStartTime) &&
    firstStudiedTime >= cycleStartTime;
};

export const isSubjectFullyStartedInCycle = (
  topics: StudyCycleSubjectTopicState[],
  cycleStart?: string | Date | null,
) => {
  const activeTopics = topics.filter(isVisibleCycleTopic);

  return activeTopics.length > 0 &&
    activeTopics.every(topic => isTopicCompleted(topic) || isTopicStartedInCycle(topic, cycleStart));
};

export const getStudyCycleSubjectActionState = ({
  isCompletedInEdital,
  isFullyStartedInCycle,
  isManuallyStudiedInCycle,
  needsCycleClosure = false,
}: SubjectActionInput): StudyCycleSubjectActionState => {
  if (isCompletedInEdital) {
    return {
      kind: 'locked_completed',
      tooltip: 'Todos os tópicos ativos desta matéria estão concluídos.',
    };
  }

  if (isManuallyStudiedInCycle) {
    return {
      kind: 'return_to_queue',
      tooltip: 'Voltar matéria para a fila',
    };
  }

  if (isFullyStartedInCycle) {
    return {
      kind: 'locked_started',
      tooltip: 'Todos os tópicos ativos já tiveram primeiro contato. As pendências agora ficam em Revisões.',
    };
  }

  return {
    kind: 'mark_studied',
    tooltip: needsCycleClosure
      ? 'Há tópicos novos neste ciclo. Marque a matéria quando encerrar este bloco.'
      : 'Marcar como estudada',
  };
};

export const getStartedTopicCycleCta = (topicName: string) => ({
  tooltip: 'Ir para revisão do tópico',
  ariaLabel: `Ir para revisão do tópico ${topicName}`,
  label: 'Ir para Revisão',
});
