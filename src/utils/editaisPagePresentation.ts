import type { Database, Json } from '@/integrations/supabase/types';
import type { Subject } from '@/types';
import type { CycleUnificationMap, HybridMergeResult, TopicMergePhaseResult } from '@/types/cycleMergeTypes';
import type { EditalProgressSummary } from '@/utils/editalProgressSummary';

export interface UserEdital {
  id: string;
  name: string;
  organ?: string;
  position?: string;
  year?: string;
  category?: string;
  examDate?: string;
  examBoard?: string;
  createdAt: string;
  updatedAt: string;
  isImported: boolean;
  aiExtractionUsed?: boolean;
  sourceId?: string;
  lastSyncSnapshot?: { source_id?: string; source_updated_at?: string | null; synced_at?: string } | null;
  subjectIds: string[];
  activeSubjectIds: string[];
  isMergedWith?: string[];
  mergedIntoCycle?: boolean;
}

export type StudySessionSummary = {
  edital_id: string | null;
  subject_id: string | null;
  session_duration_minutes: number | null;
};

type PublicEditalRow = Database['public']['Tables']['public_editais']['Row'];
export type PublicEditalSource = Pick<PublicEditalRow, 'id' | 'updated_at' | 'organ' | 'position' | 'year' | 'category' | 'exam_date' | 'exam_board'> & { subjects: Subject[] };
export type ManualCycleOrigin = { name: string; isManual: true };
export type CycleOrigin = UserEdital | ManualCycleOrigin;
export type CycleProgressMode = 'keep' | 'reset';

export type CycleConflictState = {
  isOpen: boolean;
  edital: UserEdital | null;
  existingIds: string[];
  currentOrigins: CycleOrigin[];
  step: 'select' | 'preview' | 'topic-preview' | 'success';
  action: 'merge' | 'replace' | 'hybrid' | null;
  unificationMap?: CycleUnificationMap;
  finalSubjectIds?: string[];
  hybridResult?: HybridMergeResult;
  aiStatus?: 'success' | 'error' | 'timeout';
  topicMergeResult?: TopicMergePhaseResult;
  subjectDisplayNameOverrides?: Record<string, string>;
  showIASuggestionsOnly?: boolean;
  wasTopicMerged?: boolean;
  showDetailedPreview?: boolean;
  updatedAt?: string | null;
  progressMode?: CycleProgressMode;
  progressSummary?: EditalProgressSummary;
};

export type PendingMergeDraft = Partial<Omit<CycleConflictState, 'isOpen' | 'edital'>> & { updatedAt?: string | null };

export const isManualCycleOrigin = (origin: CycleOrigin): origin is ManualCycleOrigin => 'isManual' in origin && origin.isManual;

export const parseCycleUnificationMap = (value: Json | null): CycleUnificationMap | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== 1 || !Array.isArray(value.editalIds) || !Array.isArray(value.unifiedSubjects)) return null;
  return value as unknown as CycleUnificationMap;
};

export const serializeJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
export const getJsonRecord = (value: Json | null): Record<string, Json | undefined> | null => value && typeof value === 'object' && !Array.isArray(value) ? value : null;

export const getDaysUntilExam = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const time = new Date(dateStr).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
};

export const sanitizeExamDate = (dateStr?: string): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return Number.isNaN(new Date(`${trimmed}T00:00:00`).getTime()) ? null : trimmed;
};

export const formatExamDateLabel = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sem data';
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
};

export const formatCycleSourceName = (name?: string | null): string => String(name || '').trim().replace(/\s+/g, ' ').toUpperCase();

const getLeadingTopicNumber = (name?: string | null): number[] | null => {
  const match = String(name || '').trim().match(/^(\d+(?:[.,]\d+)*)/);
  return match ? match[1].split(/[.,]/).map(Number).filter(Number.isFinite) : null;
};

export const sortTopicsByLeadingNumberWhenComplete = <T extends { name?: string | null; position?: number | null }>(topics?: T[] | null): T[] => {
  if (!Array.isArray(topics) || topics.length < 2) return topics ? [...topics] : [];
  const parsed = topics.map((topic, index) => ({ topic, index, parts: getLeadingTopicNumber(topic.name) }));
  if (parsed.some(item => !item.parts?.length)) return [...topics].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return parsed.sort((a, b) => {
    const maxLength = Math.max(a.parts!.length, b.parts!.length);
    for (let i = 0; i < maxLength; i += 1) {
      const difference = (a.parts![i] ?? -1) - (b.parts![i] ?? -1);
      if (difference !== 0) return difference;
    }
    return a.index - b.index;
  }).map(item => item.topic);
};

export const rowToEdital = (row: Record<string, unknown>): UserEdital => ({
  id: row.id as string,
  name: row.name as string,
  organ: (row.organ as string) || undefined,
  position: (row.position as string) || undefined,
  year: (row.year as string) || undefined,
  category: (row.category as string) || undefined,
  examDate: (row.exam_date as string) || undefined,
  examBoard: (row.exam_board as string) || undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  isImported: row.is_imported as boolean,
  aiExtractionUsed: row.ai_extraction_used as boolean,
  sourceId: (row.source_id as string) || undefined,
  lastSyncSnapshot: (row.last_sync_snapshot as UserEdital['lastSyncSnapshot']) || null,
  subjectIds: (row.subject_ids as string[]) || [],
  activeSubjectIds: (row.active_subject_ids as string[]) || [],
  isMergedWith: (row.merged_with as string[]) || undefined,
  mergedIntoCycle: (row.merged_into_cycle as boolean) || false,
});
