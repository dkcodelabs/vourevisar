import { describe, expect, it } from 'vitest';
import type { CycleComparisonSnapshotRow } from '@/types/cycleComparison';
import { buildCycleComparison, parseCycleComparisonSnapshot } from '@/utils/cycleComparison';

const snapshot = (
  cycleNumber: number,
  overrides: Partial<CycleComparisonSnapshotRow> = {},
): CycleComparisonSnapshotRow => ({
  id: `snapshot-${cycleNumber}`,
  cycle_number: cycleNumber,
  started_at: `2026-08-0${cycleNumber}T10:00:00.000Z`,
  completed_at: `2026-08-0${cycleNumber + 2}T10:00:00.000Z`,
  subject_count: 3,
  studied_subject_count: 3,
  topics_started_count: cycleNumber * 2,
  topics_completed_count: cycleNumber,
  cycle_subject_ids: ['subject-a', 'subject-b', 'subject-c'],
  per_subject: [],
  ...overrides,
});

describe('cycle comparison', () => {
  it('compares the latest two consecutive rotations', () => {
    const result = buildCycleComparison([snapshot(1), snapshot(2)]);

    expect(result?.comparability).toBe('full');
    expect(result?.latest.cycleNumber).toBe(2);
    expect(result?.previous.cycleNumber).toBe(1);
    expect(result?.deltas.topicsStartedCount).toEqual({ absolute: 2, percentage: 100 });
    expect(result?.latest.startPacePerDay).toBeCloseTo(4 / 2);
  });

  it('uses at least one day for a rotation closed on the same day', () => {
    const parsed = parseCycleComparisonSnapshot(snapshot(1, {
      started_at: '2026-08-01T10:00:00.000Z',
      completed_at: '2026-08-01T10:01:00.000Z',
    }));

    expect(parsed?.durationDays).toBe(1);
  });

  it('returns no comparison for missing or non-consecutive history', () => {
    expect(buildCycleComparison([snapshot(1)])).toBeNull();
    expect(buildCycleComparison([snapshot(1), snapshot(3)])).toBeNull();
  });

  it('marks a changed subject scope and keeps raw values available', () => {
    const result = buildCycleComparison([
      snapshot(1),
      snapshot(2, { cycle_subject_ids: ['subject-a', 'subject-d'] }),
    ]);

    expect(result?.comparability).toBe('scope_changed');
    expect(result?.latest.topicsStartedCount).toBe(4);
  });

  it('keeps percentage unavailable when the previous denominator is zero', () => {
    const result = buildCycleComparison([
      snapshot(1, { topics_completed_count: 0 }),
      snapshot(2, { topics_completed_count: 3 }),
    ]);

    expect(result?.deltas.topicsCompletedCount).toEqual({ absolute: 3, percentage: null });
  });

  it('ignores malformed legacy snapshots instead of inventing zero', () => {
    expect(parseCycleComparisonSnapshot(snapshot(1, { started_at: null }))).toBeNull();
    expect(parseCycleComparisonSnapshot(snapshot(1, { per_subject: {} }))).toBeNull();
  });
});
