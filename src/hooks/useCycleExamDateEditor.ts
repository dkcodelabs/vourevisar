import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { updateActiveCycleExamDate } from '@/services/cycleExamDateService';
import type { UserCycle } from '@/types';

type UseCycleExamDateEditorInput<T extends UserCycle> = {
  setUserCycle: Dispatch<SetStateAction<T | null>>;
  userCycle: T | null;
  userId?: string;
};

const saveErrorMessage = 'Não foi possível atualizar a data da prova. Tente novamente.';

export function useCycleExamDateEditor<T extends UserCycle>({
  setUserCycle,
  userCycle,
  userId,
}: UseCycleExamDateEditorInput<T>) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [examDateDraft, setExamDateDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateExamDate = useMutation({
    mutationFn: async (examDate: string) => {
      if (!userId || !userCycle) throw new Error('Ciclo ativo não encontrado');
      return updateActiveCycleExamDate({ examDate, userId });
    },
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (updatedCycle) => {
      if (!userId || !userCycle) return;

      const nextCycle = { ...userCycle, exam_date: updatedCycle.exam_date };
      setUserCycle(nextCycle);
      localStorage.setItem(`user_cycle_cache_${userId}`, JSON.stringify(nextCycle));
      setEditorOpen(false);
      toast.success('Data da prova atualizada.');
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { source: 'Subjects', action: 'updateCycleExamDate' },
      }));
    },
    onError: async (error) => {
      setErrorMessage(saveErrorMessage);
      await errorService.report(error, {
        module: 'Subjects',
        action: 'updateCycleExamDate',
        userMessage: saveErrorMessage,
        severity: 'medium',
        scope: 'core',
        userId,
      });
    },
  });

  const openEditor = useCallback(() => {
    setExamDateDraft(userCycle?.exam_date || '');
    setErrorMessage(null);
    setEditorOpen(true);
  }, [userCycle?.exam_date]);

  const saveExamDate = useCallback(async () => {
    try {
      await updateExamDate.mutateAsync(examDateDraft);
      return true;
    } catch {
      return false;
    }
  }, [examDateDraft, updateExamDate]);

  const handleEditorOpenChange = useCallback((open: boolean) => {
    if (updateExamDate.isPending) return;
    setEditorOpen(open);
    if (!open) setErrorMessage(null);
  }, [updateExamDate.isPending]);

  return {
    editorOpen,
    errorMessage,
    examDateDraft,
    handleEditorOpenChange,
    isSaving: updateExamDate.isPending,
    openEditor,
    saveExamDate,
    setExamDateDraft,
  };
}
