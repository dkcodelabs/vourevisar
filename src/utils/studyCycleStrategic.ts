import { ReviewInterval, type StudyCycleSubject, type StudyCycleTopic } from '@/types/study-cycle';
import {
  getSubjectExamWeightLabel,
  hasSubjectExamWeight,
} from '@/utils/examWeight';

export type StrategicWeightLevel = 'known' | 'none';
export type StrategicIncidenceLevel = 'high' | 'analyzed' | 'not_analyzed';

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const getSubjectStrategicWeight = (subject: Pick<
  StudyCycleSubject,
  'exam_weight_points' | 'exam_weight_questions' | 'exam_weight_percentage' | 'exam_weight_raw'
>) => {
  if (!hasSubjectExamWeight(subject)) {
    return {
      level: 'none' as StrategicWeightLevel,
      label: 'Sem peso informado',
      hasWeight: false,
    };
  }

  return {
    level: 'known' as StrategicWeightLevel,
    label: getSubjectExamWeightLabel(subject),
    hasWeight: true,
  };
};

export const getTopicStrategicIncidence = (topic: Pick<StudyCycleTopic, 'totalVolume'>) => {
  if (!hasFiniteNumber(topic.totalVolume) || topic.totalVolume <= 0) {
    return {
      level: 'not_analyzed' as StrategicIncidenceLevel,
      label: 'Incidência não analisada',
      hasIncidence: false,
      showToStudent: false,
    };
  }

  if (topic.totalVolume >= 1000) {
    return {
      level: 'high' as StrategicIncidenceLevel,
      label: 'Cobrança alta',
      hasIncidence: true,
      showToStudent: true,
    };
  }

  return {
    level: 'analyzed' as StrategicIncidenceLevel,
    label: 'Incidência analisada',
    hasIncidence: true,
    showToStudent: false,
  };
};

export const getSubjectExplorationPercentage = (topics: Pick<StudyCycleTopic, 'reviewStatus'>[]) => {
  if (topics.length === 0) return 0;

  const startedTopics = topics.filter(topic => topic.reviewStatus !== ReviewInterval.NOT_STARTED).length;
  return Math.round((startedTopics / topics.length) * 100);
};

export const getStudyCycleStrategicSummary = (subjects: StudyCycleSubject[]) => {
  const totalSubjects = subjects.length;
  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  const startedTopics = subjects.reduce(
    (sum, subject) => sum + subject.topics.filter(topic => topic.reviewStatus !== ReviewInterval.NOT_STARTED).length,
    0,
  );
  const completedTopics = subjects.reduce(
    (sum, subject) => sum + subject.topics.filter(topic => topic.reviewStatus === ReviewInterval.COMPLETED).length,
    0,
  );
  const subjectsWithoutWeight = subjects.filter(subject => !subject.strategicWeight?.hasWeight).length;
  const topicsWithoutIncidence = subjects.reduce(
    (sum, subject) => sum + subject.topics.filter(topic => !topic.strategicIncidence?.hasIncidence).length,
    0,
  );

  return {
    totalSubjects,
    totalTopics,
    startedTopics,
    completedTopics,
    subjectsWithoutWeight,
    topicsWithoutIncidence,
    editalCoveragePercentage: totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0,
  };
};
