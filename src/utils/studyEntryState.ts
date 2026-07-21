export type StudyEmptyStateKind = 'no-edital' | 'empty-edital' | 'no-cycle';

type StudyEntryStateInput = {
  editalCount: number;
  editaisWithContentCount: number;
  hasActiveCycle: boolean;
};

/**
 * Keeps the first actionable state consistent across study pages.
 * An edital without subjects is not ready to be loaded into the cycle.
 */
export function getStudyEmptyStateKind({
  editalCount,
  editaisWithContentCount,
  hasActiveCycle,
}: StudyEntryStateInput): StudyEmptyStateKind | null {
  if (hasActiveCycle) return null;
  if (editalCount === 0) return 'no-edital';
  if (editaisWithContentCount === 0) return 'empty-edital';
  return 'no-cycle';
}
