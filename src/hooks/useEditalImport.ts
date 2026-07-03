import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import {
  importEdital,
  type EditalImportExtraInfo,
} from '@/services/editalImportService';
import type { Subject } from '@/types';

type UseEditalImportInput = {
  closeModal: () => void;
  refreshData: () => Promise<void>;
  refreshOrigins: () => void | Promise<void>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  userId?: string;
};

export function useEditalImport({
  closeModal,
  refreshData,
  refreshOrigins,
  setIsLoading,
  userId,
}: UseEditalImportInput) {
  const importSubjects = useCallback(async (
    subjects: Subject[],
    editalName?: string,
    isImported = true,
    sourceId?: string,
    extraInfo?: EditalImportExtraInfo,
  ) => {
    if (!userId) throw new Error('Usuário não autenticado para importar edital.');

    const finalName = editalName?.trim() || 'IMPORTADO';
    setIsLoading(true);
    try {
      await importEdital({
        editalName: finalName,
        extraInfo,
        isImported,
        sourceId,
        subjects,
        userId,
      });
      await refreshData();
      await refreshOrigins();
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
      window.dispatchEvent(new CustomEvent('topicUpdated', { detail: { source: 'Subjects' } }));
      toast.success(`${subjects.length} matérias vinculadas a "${finalName}" com sucesso!`);
      closeModal();
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects',
        action: 'import',
        userMessage: 'Erro ao importar matérias.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [closeModal, refreshData, refreshOrigins, setIsLoading, userId]);

  return { importSubjects };
}
