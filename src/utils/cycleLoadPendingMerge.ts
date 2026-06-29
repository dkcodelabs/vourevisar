type PendingCycleMergeMap<TPendingMerge = unknown> = Record<string, TPendingMerge | undefined>;

type CycleLoadPendingMergeOptions = {
  ignorePendingMerge?: boolean;
};

export function getPendingMergeForCycleLoad<TPendingMerge>(
  pendingMerges: PendingCycleMergeMap<TPendingMerge>,
  editalId: string,
  options: CycleLoadPendingMergeOptions = {},
): TPendingMerge | null {
  if (options.ignorePendingMerge) return null;

  return pendingMerges[editalId] ?? null;
}
