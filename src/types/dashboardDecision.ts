export type DashboardActionKind =
  | 'review_overdue'
  | 'review_today'
  | 'start_cycle_topic'
  | 'continue_cycle_topic'
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

export type DashboardNavigate = (href: string, target?: DashboardActionTarget) => void;
export type DashboardDataIssueSource = 'activity' | 'reminders';

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
}

export interface DashboardCycleSubject {
  id: string;
  name: string;
  cyclePosition: number;
  isCompletedInCycle: boolean;
  topics: DashboardCycleTopic[];
}


export interface DashboardExamContext {
  editalName: string | null;
  position: string | null;
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
  createdAt: string | null;
  completedAt: string | null;
  href: string;
}

export interface DashboardRecentPaceDay {
  date: string;
  studiedCount: number;
  reviewedCount: number;
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
  dataIssues: DashboardDataIssueSource[];
  studyEntryState?: 'no-edital' | 'empty-edital' | 'no-cycle' | null;
  examContext: DashboardExamContext;
  pace: DashboardPace;
  nextBestAction: DashboardAction;
  actionQueue: DashboardAction[];
  continueCycleItems: DashboardAction[];
  reminders: DashboardReminder[];
  activityDays: DashboardRecentPaceDay[];
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
