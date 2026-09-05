import type {
  CycleComparisonData,
  CycleComparisonDelta,
  CycleComparisonSnapshot,
  CycleComparisonSnapshotRow,
} from '@/types/cycleComparison';

const DAY_MS = 24 * 60 * 60 * 1000;

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const getDelta = (latest: number, previous: number): CycleComparisonDelta => ({
  absolute: latest - previous,
  percentage: previous > 0
    ? Math.round(((latest - previous) / previous) * 1000) / 10
    : null,
});

const sameSubjectScope = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((id, index) => id === normalizedRight[index]);
};

export const parseCycleComparisonSnapshot = (
  row: CycleComparisonSnapshotRow,
): CycleComparisonSnapshot | null => {
  const startedAt = row.started_at ? new Date(row.started_at) : null;
  const completedAt = new Date(row.completed_at);
  if (
    !row.id ||
    !Number.isInteger(row.cycle_number) ||
    row.cycle_number < 1 ||
    !startedAt ||
    !Number.isFinite(startedAt.getTime()) ||
    !Number.isFinite(completedAt.getTime()) ||
    completedAt.getTime() < startedAt.getTime() ||
    !finiteNonNegative(row.subject_count) ||
    !finiteNonNegative(row.studied_subject_count) ||
    !finiteNonNegative(row.topics_started_count) ||
    !finiteNonNegative(row.topics_completed_count) ||
    !Array.isArray(row.cycle_subject_ids) ||
    !Array.isArray(row.per_subject)
  ) {
    return null;
  }

  const durationDays = Math.max(
    1,
    Math.ceil((completedAt.getTime() - startedAt.getTime()) / DAY_MS),
  );

  return {
    id: row.id,
    cycleNumber: row.cycle_number,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationDays,
    subjectCount: row.subject_count,
    studiedSubjectCount: row.studied_subject_count,
    topicsStartedCount: row.topics_started_count,
    topicsCompletedCount: row.topics_completed_count,
    cycleSubjectIds: row.cycle_subject_ids,
    startPacePerDay: row.topics_started_count / durationDays,
    consolidationPacePerDay: row.topics_completed_count / durationDays,
  };
};

export const buildCycleComparison = (
  rows: CycleComparisonSnapshotRow[],
): CycleComparisonData | null => {
  const snapshots = rows
    .map(parseCycleComparisonSnapshot)
    .filter((snapshot): snapshot is CycleComparisonSnapshot => Boolean(snapshot))
    .sort((left, right) => right.cycleNumber - left.cycleNumber);

  const latest = snapshots[0];
  const previous = snapshots[1];
  if (!latest || !previous || latest.cycleNumber !== previous.cycleNumber + 1) return null;

  return {
    comparability: sameSubjectScope(latest.cycleSubjectIds, previous.cycleSubjectIds)
      ? 'full'
      : 'scope_changed',
    latest,
    previous,
    deltas: {
      durationDays: getDelta(latest.durationDays, previous.durationDays),
      studiedSubjectCount: getDelta(latest.studiedSubjectCount, previous.studiedSubjectCount),
      topicsStartedCount: getDelta(latest.topicsStartedCount, previous.topicsStartedCount),
      topicsCompletedCount: getDelta(latest.topicsCompletedCount, previous.topicsCompletedCount),
      startPacePerDay: getDelta(latest.startPacePerDay, previous.startPacePerDay),
      consolidationPacePerDay: getDelta(latest.consolidationPacePerDay, previous.consolidationPacePerDay),
    },
  };
};
