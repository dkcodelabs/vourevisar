import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import { deleteSubjectPermanently } from '@/services/subjectPermanentDeletionService';
import type { Subject } from '@/types';

type SubjectEditalReference = {
  id: string;
  name: string;
  is_imported: boolean;
  source_id: string | null;
};

export type PermanentSubjectDeletionConfirmation = {
  isOpen: boolean;
  subjectId: string | null;
  subjectName: string | null;
  editais: SubjectEditalReference[];
};

const initialConfirmation: PermanentSubjectDeletionConfirmation = {
  isOpen: false,
  subjectId: null,
  subjectName: null,
  editais: [],
};

type UsePermanentSubjectDeletionInput = {
  refreshOrigins: () => void | Promise<void>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setLocalSubjects: Dispatch<SetStateAction<Subject[]>>;
  userId?: string;
};

export function usePermanentSubjectDeletion({
  refreshOrigins,
  setIsLoading,
  setLocalSubjects,
  userId,
}: UsePermanentSubjectDeletionInput) {
  const [deletePermanentConfirm, setDeletePermanentConfirm] =
    useState<PermanentSubjectDeletionConfirmation>(initialConfirmation);

  const deletePermanent = useCallback(async (
    subjectId: string,
    editalIdToRemove?: string,
  ) => {
    if (!userId) return false;

    setIsLoading(true);
    try {
      const { subjectDeleted } = await deleteSubjectPermanently({
        editalIdToRemove,
        subjectId,
        userId,
      });

      if (subjectDeleted) {
        setLocalSubjects(previous => previous.filter(subject => subject.id !== subjectId));
      }

      await refreshOrigins();
      toast.success(subjectDeleted
        ? 'Matéria excluída do edital!'
        : 'Matéria removida do edital!'
      );
      return true;
    } catch (error) {
      toastGate.notifyError(
        'Erro ao excluir matéria. Tente novamente.',
        'DEL-ERR-01',
        { severity: 'high' },
      );
      errorService.report(error, {
        module: 'Subjects',
        action: 'deletePermanent',
        userMessage: 'Erro ao excluir matéria.',
      });
      return false;
    } finally {
      setIsLoading(false);
      setDeletePermanentConfirm(initialConfirmation);
    }
  }, [refreshOrigins, setIsLoading, setLocalSubjects, userId]);

  return {
    deletePermanent,
    deletePermanentConfirm,
    setDeletePermanentConfirm,
  };
}
