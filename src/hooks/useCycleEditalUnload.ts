import { useCallback, useState } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { unloadEditalFromCycle } from '@/services/cycleUnloadService';

export type CycleEditalUnloadConfirmation = {
  isOpen: boolean;
  editalId: string | null;
  editalName: string | null;
  subjectIds: string[];
};

const initialConfirmation: CycleEditalUnloadConfirmation = {
  isOpen: false,
  editalId: null,
  editalName: null,
  subjectIds: [],
};

type UseCycleEditalUnloadOptions = {
  refreshData: () => Promise<void>;
  userId?: string;
};

export function useCycleEditalUnload({
  refreshData,
  userId,
}: UseCycleEditalUnloadOptions) {
  const [unloadingEditalId, setUnloadingEditalId] = useState<string | null>(null);
  const [unloadConfirm, setUnloadConfirm] = useState<CycleEditalUnloadConfirmation>(initialConfirmation);

  const unloadEdital = useCallback(async (
    editalId: string,
    editalName: string,
  ): Promise<boolean> => {
    if (!userId || unloadingEditalId === editalId) return false;

    setUnloadingEditalId(editalId);
    try {
      const { cycleDeleted } = await unloadEditalFromCycle({ userId, editalId });

      localStorage.removeItem(`user_cycle_cache_${userId}`);
      toast.success(cycleDeleted
        ? `"${editalName}" removido. Ciclo de estudos encerrado.`
        : `"${editalName}" removido do ciclo.`
      );
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'unload', editalId } }));
      await refreshData();
      return true;
    } catch (error) {
      errorService.report(error, {
        module: 'Subjects',
        action: 'unloadCycle',
        userMessage: 'Erro ao remover edital do ciclo.',
      });
      return false;
    } finally {
      setUnloadingEditalId(null);
    }
  }, [refreshData, unloadingEditalId, userId]);

  return {
    setUnloadConfirm,
    unloadConfirm,
    unloadEdital,
    unloadingEditalId,
  };
}
