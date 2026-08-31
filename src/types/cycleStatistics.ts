import type { LearningStatus } from '@/utils/calculateNextReview';

export type CycleStatisticsPeriod = 7 | 14 | 30 | 'all';

export type StatisticsTone = 'neutral' | 'positive' | 'attention' | 'critical';

export interface CycleStatisticsProgress {
  total: number;
  notStarted: number;
  started: number;
  inDevelopment: number;
  completed: number;
  coveragePercentage: number;
  completionPercentage: number;
}

export interface CycleStatisticsMemory {
  eligible: number;
  learning: number;
  fixing: number;
  mastering: number;
  overdue: number;
  dueToday: number;
  future: number;
  unscheduled: number;
}

export interface CycleStatisticsDay {
  date: string;
  label: string;
  minutes: number;
  isActive: boolean;
}

export interface CycleStatisticsTime {
  totalMinutes: number;
  averagePerActiveDay: number;
  activeDays: number;
  periodDays: number;
  currentStreak: number;
  bestStreak: number;
  isAllCycle: boolean;
  previousPeriodMinutes: number;
  comparisonPercentage: number | null;
  daily: CycleStatisticsDay[];
}

export type CycleStatisticsContactType = 'study' | 'review' | 'questions';

export interface CycleStatisticsDayContactInput {
  id: string;
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  reviewedAt: string;
  type: CycleStatisticsContactType;
}

export interface CycleStatisticsSelectedDay {
  date: string;
  label: string;
  sessionMinutes: number;
  subjectMinutes: Array<{
    subjectId: string;
    subjectName: string;
    color: string | null;
    minutes: number;
  }>;
  contacts: CycleStatisticsDayContactInput[];
  contactsUnavailable: boolean;
}

export interface CycleStatisticsSubject {
  id: string;
  name: string;
  color: string | null;
  totalTopics: number;
  startedTopics: number;
  completedTopics: number;
  overdueReviews: number;
  studyMinutes: number;
  coveragePercentage: number;
  weightLabel: string;
  hasWeight: boolean;
  difficulty: {
    ratedTopics: number;
    easyTopics: number;
    mediumTopics: number;
    hardTopics: number;
  };
}

export interface CycleStatisticsInsight {
  id: string;
  tone: StatisticsTone;
  title: string;
  description: string;
  evidence: string;
  actionLabel: string;
  actionHref: '/revisoes' | '/ciclo-estudos';
  focusSubjectId?: string;
}

export interface CycleStatisticsData {
  cycleId: string;
  cycleName: string;
  editalLabel: string;
  examDate: string | null;
  combinedEditaisCount: number;
  progress: CycleStatisticsProgress;
  memory: CycleStatisticsMemory;
  time: CycleStatisticsTime;
  subjects: CycleStatisticsSubject[];
  insight: CycleStatisticsInsight;
  hasStudyTime: boolean;
  selectedDay: CycleStatisticsSelectedDay | null;
}

export interface CycleStatisticsTopicInput {
  id: string;
  name: string;
  subjectId: string;
  sourceTopicIds: string[];
  completed: boolean;
  reviewCount: number;
  reviewStage: string | null;
  nextReview: string | null;
  firstStudiedAt: string | null;
  lastReviewedAt: string | null;
  memoryStability: number | null;
  currentInterval: number | null;
  difficultyLevel: number | null;
  learningStatus?: LearningStatus;
}

export interface CycleStatisticsSubjectInput {
  id: string;
  name: string;
  color: string | null;
  sourceSubjectIds: string[];
  examWeightPoints: number | null;
  examWeightQuestions: number | null;
  examWeightPercentage: number | null;
  examWeightRaw: string | null;
}

export interface CycleStatisticsSessionInput {
  id: string;
  subjectId: string | null;
  studyDate: string;
  durationMinutes: number;
}

export interface BuildCycleStatisticsInput {
  cycle: {
    id: string;
    name: string | null;
    examDate: string | null;
    startedAt: string | null;
  };
  editalNames: string[];
  period: CycleStatisticsPeriod;
  topics: CycleStatisticsTopicInput[];
  subjects: CycleStatisticsSubjectInput[];
  sessions: CycleStatisticsSessionInput[];
  selectedDate?: string | null;
  dayContacts?: CycleStatisticsDayContactInput[];
  dayContactsUnavailable?: boolean;
  now?: Date;
}
