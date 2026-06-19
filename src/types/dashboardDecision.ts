export type DashboardActionKind =
  | 'review_overdue'
  | 'review_today'
  | 'start_cycle_topic'
  | 'continue_cycle_topic'
  | 'strategic_high_charge'
  | 'configure_exam_date'
  | 'load_cycle'
  | 'all_caught_up';

export type DashboardActionTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

export interface DashboardActionTarget {
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicName?: string;
  editalId?: string;
  reminderId?: string;
}

export interface DashboardAction {
  id: string;
  kind: DashboardActionKind;
  tone: DashboardActionTone;
  title: string;
  description: string;
  reason: string;
  scientificBasis?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  target: DashboardActionTarget;
  priorityScore: number;
  dueDate?: string | null;
  metadata?: {
    reviewCount?: number | null;
    daysOverdue?: number | null;
    totalVolume?: number | null;
  };
}

export interface DashboardReviewTopic {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  nextReview: string | null;
  reviewCount: number;
  difficultyLevel?: number | null;
  memoryStability?: number | null;
  currentInterval?: number | null;
}

export interface DashboardCycleTopic {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  firstStudiedAt?: string | null;
  reviewCount?: number | null;
  completed?: boolean | null;
  nextReview?: string | null;
  difficultyLevel?: number | null;
  totalVolume?: number | null;
}

export interface DashboardCycleSubject {
  id: string;
  name: string;
  cyclePosition: number;
  isCompletedInCycle: boolean;
  topics: DashboardCycleTopic[];
}

export type ChargeCoverageState = 'none' | 'partial' | 'sufficient';

export interface DashboardExamContext {
  editalName: string | null;
  editalId?: string;
  examDate: string | null;
  daysRemaining: number | null;
  state: 'ready' | 'missing_cycle' | 'missing_exam_date' | 'exam_date_past';
}

export interface DashboardPace {
  state: 'ready' | 'missing_cycle' | 'missing_exam_date' | 'exam_date_past' | 'insufficient_data';
  daysRemaining: number | null;
  newTopicsPerDay: number | null;
  reviewsPerDay: number | null;
  unstartedTopics: number;
  pendingReviews: number;
  futureReviewsInWindow: number;
  explanation: string;
}

export interface DashboardReminder {
  id: string;
  text: string;
  reminderDate: string | null;
  completed: boolean;
  href: string;
}

export interface DashboardActivityDay {
  date: string;
  studiedCount: number;
  reviewedCount: number;
  questionsCount: number;
  totalDurationMinutes: number;
  difficultyAverage: number | null;
  entries: Array<{
    id: string;
    topicId: string | null;
    topicName: string;
    subjectName?: string | null;
    durationMinutes: number;
    reviewedAt: string;
    type: 'study' | 'review' | 'questions';
  }>;
}

export interface DashboardDifficultySummary {
  easy: number;
  medium: number;
  hard: number;
  totalRated: number;
}

export interface DashboardProgressSummary {
  startedTopics: number;
  inProgressTopics: number;
  completedTopics: number;
  totalTopics: number;
  editalProgressPercentage: number;
}

export interface DashboardDecisionModel {
  isLoading: boolean;
  error: unknown;
  examContext: DashboardExamContext;
  pace: DashboardPace;
  nextBestAction: DashboardAction;
  actionQueue: DashboardAction[];
  continueCycleItems: DashboardAction[];
  reminders: DashboardReminder[];
  activityDays: DashboardActivityDay[];
  chargeCoverage: ChargeCoverageState;
  difficultySummary: DashboardDifficultySummary;
  progressSummary: DashboardProgressSummary;
  totals: {
    overdueReviews: number;
    todayReviews: number;
    futureReviews: number;
    unstartedTopics: number;
    startedTopics: number;
    completedTopics: number;
    totalTopics: number;
  };
}
