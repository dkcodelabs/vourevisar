export type StudyEmptyStateKind = 'no-edital' | 'empty-edital' | 'no-cycle';

type StudyEntryStateInput = {
  editalCount: number;
  editaisWithContentCount: number;
  hasAnyContent?: boolean;
  hasActiveCycle: boolean;
};

/**
 * Keeps the first actionable state consistent across study pages.
 * An edital without subjects is not ready to be loaded into the cycle.
 */
export function getStudyEmptyStateKind({
  editalCount,
  editaisWithContentCount,
  hasAnyContent = false,
  hasActiveCycle,
}: StudyEntryStateInput): StudyEmptyStateKind | null {
  if (hasActiveCycle) return null;
  const hasContent = editaisWithContentCount > 0 || hasAnyContent;
  if (editalCount === 0 && !hasContent) return 'no-edital';
  if (!hasContent) return 'empty-edital';
  return 'no-cycle';
}
