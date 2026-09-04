import type { UserEdital } from '@/utils/editaisPagePresentation';

export function getSyncedSourceTime(edital: UserEdital): number | null {
  const sourceUpdatedAt = edital.lastSyncSnapshot?.source_updated_at;
  if (!sourceUpdatedAt) return null;
  const time = new Date(sourceUpdatedAt).getTime();
  return Number.isNaN(time) ? null : time;
}

type EditalMetadataSource = {
  organ?: string | null;
  position?: string | null;
  year?: string | null;
  category?: string | null;
  exam_date?: string | null;
  exam_board?: string | null;
};

export function hasEditalMetadataDiff(edital: UserEdital, source?: EditalMetadataSource): boolean {
  if (!source) return false;
  const normalize = (value?: string | null) => (value || '').trim();
  return normalize(source.organ) !== normalize(edital.organ) ||
    normalize(source.position) !== normalize(edital.position) ||
    normalize(source.year) !== normalize(edital.year) ||
    normalize(source.category) !== normalize(edital.category) ||
    normalize(source.exam_date) !== normalize(edital.examDate) ||
    normalize(source.exam_board) !== normalize(edital.examBoard);
}
