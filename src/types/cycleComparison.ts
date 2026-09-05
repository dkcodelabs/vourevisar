export type CycleComparisonSnapshot = {
  id: string;
  cycleNumber: number;
  startedAt: string;
  completedAt: string;
  durationDays: number;
  subjectCount: number;
  studiedSubjectCount: number;
  topicsStartedCount: number;
  topicsCompletedCount: number;
  cycleSubjectIds: string[];
  startPacePerDay: number;
  consolidationPacePerDay: number;
};

export type CycleComparisonDelta = {
  absolute: number;
  percentage: number | null;
};

export type CycleComparisonData = {
  comparability: 'full' | 'scope_changed';
  latest: CycleComparisonSnapshot;
  previous: CycleComparisonSnapshot;
  deltas: {
    durationDays: CycleComparisonDelta;
    studiedSubjectCount: CycleComparisonDelta;
    topicsStartedCount: CycleComparisonDelta;
    topicsCompletedCount: CycleComparisonDelta;
    startPacePerDay: CycleComparisonDelta;
    consolidationPacePerDay: CycleComparisonDelta;
  };
};

export type CycleComparisonSnapshotRow = {
  id: string;
  cycle_number: number;
  started_at: string | null;
  completed_at: string;
  subject_count: number;
  studied_subject_count: number;
  topics_started_count: number;
  topics_completed_count: number;
  cycle_subject_ids: string[];
  per_subject: unknown;
};
