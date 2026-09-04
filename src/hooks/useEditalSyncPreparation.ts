import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subject } from '@/types';
import type { UserEdital } from '@/utils/editaisPagePresentation';
import { editaisPageDataClient } from '@/services/editaisPageService';
import { errorService } from '@/lib/errors/errorService';

export type SyncReviewState = {
  isOpen: boolean;
  edital: UserEdital | null;
  localSubjects: Subject[];
  sourceSubjects: Subject[];
  sourceUpdatedAt?: string | null;
  sourceMetadata?: { organ?: string | null; position?: string | null; year?: string | null; category?: string | null; exam_date?: string | null; exam_board?: string | null } | null;
};

export const useEditalSyncPreparation = ({ setProcessingId, setSyncReview, userId }: {
  setProcessingId: Dispatch<SetStateAction<string | null>>;
  setSyncReview: Dispatch<SetStateAction<SyncReviewState>>;
  userId?: string;
}) => {
  const handleSyncEdital = useCallback(async (edital: UserEdital) => {
    if (!userId || !edital.sourceId) return;
    setProcessingId(edital.id);
    try {
      const [sourceResult, localResult] = await Promise.all([
        editaisPageDataClient.from('public_editais').select('*').eq('id', edital.sourceId).maybeSingle(),
        editaisPageDataClient.from('subjects').select('id, name, status, topics(id, name, completed, review_count)').in('id', edital.subjectIds || []),
      ]);
      if (sourceResult.error) throw sourceResult.error;
      if (!sourceResult.data) throw new Error('Edital original não encontrado');
      if (localResult.error) console.error('Erro no refetch local:', localResult.error);
      setSyncReview({
        isOpen: true,
        edital,
        localSubjects: (localResult.data as unknown as Subject[]) || [],
        sourceSubjects: sourceResult.data.subjects || [],
        sourceUpdatedAt: sourceResult.data.updated_at ?? null,
        sourceMetadata: {
          organ: sourceResult.data.organ ?? null, position: sourceResult.data.position ?? null,
          year: sourceResult.data.year ?? null, category: sourceResult.data.category ?? null,
          exam_date: sourceResult.data.exam_date ?? null, exam_board: sourceResult.data.exam_board ?? null,
        },
      });
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'sync-prep', userMessage: 'Erro ao buscar edital oficial.' });
    } finally { setProcessingId(null); }
  }, [setProcessingId, setSyncReview, userId]);
  return { handleSyncEdital };
};
