import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import type { StudyCycleUserCycle } from '@/hooks/useStudyCyclePageData';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { updateActiveCycleName } from '@/services/cycleNameService';

export const useSubjectsCycleName = ({
  setUserCycle,
  user,
  userCycle,
}: {
  setUserCycle: Dispatch<SetStateAction<StudyCycleUserCycle | null>>;
  user: User | null;
  userCycle: StudyCycleUserCycle | null;
}) => {
  const handleRenameCycle = useCallback(async (name: string) => {
    if (!user?.id || !userCycle) throw new Error('Ciclo ativo não encontrado');
    try {
      const updatedCycle = await updateActiveCycleName({ name, userId: user.id });
      const nextCycle = { ...userCycle, name: updatedCycle.name };
      setUserCycle(nextCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextCycle));
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'updateCycleName' } }));
      toast.success('Nome do ciclo atualizado.');
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects', action: 'updateCycleName', userMessage: 'Não foi possível atualizar o nome do ciclo.',
        severity: 'medium', scope: 'core', userId: user.id,
      });
      throw error;
    }
  }, [setUserCycle, user?.id, userCycle]);

  return { handleRenameCycle };
};
