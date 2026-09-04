import { useCallback } from 'react';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { updateEditalRecord } from '@/services/editaisPageService';
import { recalculatePendingReviewsForEdital } from '@/services/topicReviewScheduleService';

type Updates = { organ: string; position: string; year: string; exam_date?: string; exam_board?: string };

export const useEditalMetadataActions = ({ fetchEditais, userId }: { fetchEditais: () => Promise<void>; userId?: string }) => {
  const handleSaveEdital = useCallback(async (id: string, updates: Updates) => {
    try {
      await updateEditalRecord(id, {
        organ: updates.organ, position: updates.position, year: updates.year,
        exam_date: updates.exam_date || null, exam_board: updates.exam_board || null,
        name: updates.position ? `${updates.organ} - ${updates.position}` : updates.organ,
        updated_at: new Date().toISOString(),
      });
      if (userId && updates.exam_date) {
        try {
          await toast.promise(recalculatePendingReviewsForEdital({ editalId: id, userId, examDate: updates.exam_date }), {
            loading: 'Recalculando o plano de revisões…',
            success: result => result.adjustedCount > 0 ? `Edital atualizado. ${result.adjustedCount} ${result.adjustedCount === 1 ? 'revisão foi ajustada' : 'revisões foram ajustadas'} à data da prova.` : 'Edital atualizado. Seu plano de revisões já está adequado.',
            error: 'Edital salvo, mas não foi possível recalcular as revisões agora.',
          });
        } catch (error) {
          console.warn('[Editais] Falha ao recalcular revisões após atualizar a prova:', error);
        }
      } else if (updates.exam_date) toast.success('Edital atualizado com sucesso!');
      else toast.info('Edital atualizado sem data de prova. Revisões e métricas seguem sem ajuste por prova até você informar uma data.');
      await fetchEditais();
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'save', userMessage: 'Erro ao salvar alterações.' });
    }
  }, [fetchEditais, userId]);

  return { handleSaveEdital };
};
