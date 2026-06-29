import { describe, expect, it } from 'vitest';

import { getPendingMergeForCycleLoad } from './cycleLoadPendingMerge';

describe('getPendingMergeForCycleLoad', () => {
  it('ignores a recovered pending merge when the user discarded it and reloads the cycle', () => {
    const pendingMerges = {
      'edital-1': {
        step: 'preview',
        action: 'merge',
      },
    };

    expect(getPendingMergeForCycleLoad(pendingMerges, 'edital-1', { ignorePendingMerge: true })).toBeNull();
  });

  it('returns the recovered pending merge during a regular cycle load', () => {
    const pending = {
      step: 'preview',
      action: 'merge',
    };

    expect(getPendingMergeForCycleLoad({ 'edital-1': pending }, 'edital-1')).toBe(pending);
  });
});
