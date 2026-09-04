import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subject } from '@/types';
import type { SyncReviewState } from '@/hooks/useEditalSyncPreparation';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { applyEditalSyncContent, updateUserEditalRecord } from '@/services/editaisPageService';
import { sanitizeExamDate, type UserEdital } from '@/utils/editaisPagePresentation';

export const useEditalSyncApplication = ({ fetchEditais, refreshData, setProcessingId, setSyncReview, syncReview, userId }: {
  fetchEditais: () => Promise<void>;
  refreshData: () => Promise<unknown> | unknown;
  setProcessingId: Dispatch<SetStateAction<string | null>>;
  setSyncReview: Dispatch<SetStateAction<SyncReviewState>>;
  syncReview: SyncReviewState;
  userId?: string;
}) => {
  const applySyncChanges = useCallback(async (addedSubjects: Subject[], addedTopics: Record<string, string[]>, removedSubjIds: string[], removedTopIds: string[]) => {
    const edital = syncReview.edital;
    if (!userId || !edital) return;
    setProcessingId(edital.id);
    try {
      const { finalSubjectIds } = await applyEditalSyncContent(userId, edital.id, edital.subjectIds || [], addedSubjects.map(subject => ({ name: subject.name, topics: subject.topics })), addedTopics, removedSubjIds, removedTopIds);
      const metadata = syncReview.sourceMetadata;
      const organ = metadata?.organ?.trim() || edital.organ || edital.name;
      const position = metadata?.position?.trim() || edital.position || '';
      const year = metadata?.year?.trim() || edital.year || '';
      const name = position ? `${organ} - ${position}${year ? ` (${year})` : ''}` : organ;
      await updateUserEditalRecord(edital.id, userId, {
        name, organ: metadata?.organ ?? edital.organ ?? null, position: metadata?.position ?? edital.position ?? null,
        year: metadata?.year ?? edital.year ?? null, category: metadata?.category ?? null,
        exam_date: sanitizeExamDate(metadata?.exam_date || undefined), exam_board: metadata?.exam_board ?? edital.examBoard ?? null,
        subject_ids: finalSubjectIds, active_subject_ids: finalSubjectIds,
        last_sync_snapshot: edital.sourceId ? { source_id: edital.sourceId, source_updated_at: syncReview.sourceUpdatedAt ?? null, synced_at: new Date().toISOString() } : null,
        updated_at: new Date().toISOString(),
      });
      toast.success('Edital atualizado com sucesso!');
      await fetchEditais(); await refreshData();
      window.dispatchEvent(new CustomEvent('subjectUpdated')); window.dispatchEvent(new CustomEvent('topicUpdated'));
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'sync-apply', userMessage: 'Erro ao aplicar atualizações.' });
      toastGate.notifyError('Não consegui aplicar a sincronização agora. Tente novamente; se persistir, revise sua conexão ou o edital oficial.', 'PAGES-EDITAIS-01', { severity: 'medium' });
    } finally {
      setProcessingId(null); setSyncReview(previous => ({ ...previous, isOpen: false }));
    }
  }, [fetchEditais, refreshData, setProcessingId, setSyncReview, syncReview, userId]);
  return { applySyncChanges };
};
