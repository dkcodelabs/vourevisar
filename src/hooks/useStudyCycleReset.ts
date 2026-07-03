import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { resetStudyCycle, type StudyCycleResetFields } from '@/services/studyCycleResetService';
import type { UserCycle } from '@/types';

type UseStudyCycleResetInput = {
  setUserCycle: Dispatch<SetStateAction<UserCycle | null>>;
  userCycle: UserCycle | null;
  userId?: string;
};

export function useStudyCycleReset({
  setUserCycle,
  userCycle,
  userId,
}: UseStudyCycleResetInput) {
  const [resetCycleConfirmOpen, setResetCycleConfirmOpen] = useState(false);
  const [isResettingCycle, setIsResettingCycle] = useState(false);

  const resetCycle = useCallback(async () => {
    if (!userId || !userCycle || isResettingCycle) return false;

    const resetCycleFields: StudyCycleResetFields = {
      materias_estudadas_ciclo: [],
      ciclos_realizados: 0,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
    };
    const previousUserCycle = userCycle;
    const nextUserCycle = { ...userCycle, ...resetCycleFields };

    setIsResettingCycle(true);
    setUserCycle(nextUserCycle);
    localStorage.setItem(`user_cycle_cache_${userId}`, JSON.stringify(nextUserCycle));

    try {
      await resetStudyCycle({ fields: resetCycleFields, userId });
      setResetCycleConfirmOpen(false);
      toast.success('Ciclo reiniciado.');
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { source: 'Subjects', action: 'resetCycle' },
      }));
      return true;
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${userId}`, JSON.stringify(previousUserCycle));
      await errorService.report(error, {
        module: 'Subjects',
        action: 'handleResetCycle',
        userMessage: 'Erro ao reiniciar ciclo.',
        severity: 'medium',
        scope: 'core',
        userId,
      });
      return false;
    } finally {
      setIsResettingCycle(false);
    }
  }, [isResettingCycle, setUserCycle, userCycle, userId]);

  return {
    isResettingCycle,
    resetCycle,
    resetCycleConfirmOpen,
    setResetCycleConfirmOpen,
  };
}
