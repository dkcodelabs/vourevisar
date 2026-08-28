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
  now?: Date;
}
