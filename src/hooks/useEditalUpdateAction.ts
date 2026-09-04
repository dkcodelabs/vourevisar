import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UserEdital } from '@/utils/editaisPagePresentation';
import { errorService } from '@/lib/errors/errorService';
import { updateUserEditalRecord } from '@/services/editaisPageService';

export const useEditalUpdateAction = ({ setEditais, userId }: {
  setEditais: Dispatch<SetStateAction<UserEdital[]>>;
  userId?: string;
}) => {
  const handleUpdateEdital = useCallback(async (updatedEdital: UserEdital) => {
    if (!userId) return;
    try {
      await updateUserEditalRecord(updatedEdital.id, userId, {
        name: updatedEdital.name,
        subject_ids: updatedEdital.subjectIds,
        active_subject_ids: updatedEdital.activeSubjectIds,
        exam_date: updatedEdital.examDate || null,
        exam_board: updatedEdital.examBoard || null,
        updated_at: new Date().toISOString(),
      });
      setEditais(current => current.map(edital => edital.id === updatedEdital.id ? updatedEdital : edital));
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'update', userMessage: 'Erro ao atualizar edital.' });
    }
  }, [setEditais, userId]);

  return { handleUpdateEdital };
};
