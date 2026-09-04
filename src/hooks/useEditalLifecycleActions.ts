import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UserEdital } from '@/utils/editaisPagePresentation';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { deleteEditalData, fetchUserCycleForEditalMerge } from '@/services/editaisPageService';
import { mergeService } from '@/services/mergeService';
import { unloadEditalFromCycle } from '@/services/cycleUnloadService';
import { parseCycleUnificationMap } from '@/utils/editaisPagePresentation';

export const useEditalLifecycleActions = ({
  canRunCycleStructuralOperation, clearPendingSuggestions, discardPendingMerge, fetchEditais,
  processingId, refreshData, setDeleteConfirm, setEditais, setPendingSuggestions, setProcessingId,
  setRemovalProgress, userId,
}: {
  canRunCycleStructuralOperation: () => boolean;
  clearPendingSuggestions: (userId: string) => Promise<void>;
  discardPendingMerge: (mode: 'all') => Promise<void>;
  fetchEditais: () => Promise<void>;
  processingId: string | null;
  refreshData: () => Promise<unknown> | unknown;
  setDeleteConfirm: Dispatch<SetStateAction<{ isOpen: boolean; edital: UserEdital | null }>>;
  setEditais: Dispatch<SetStateAction<UserEdital[]>>;
  setPendingSuggestions: Dispatch<SetStateAction<unknown[]>>;
  setProcessingId: Dispatch<SetStateAction<string | null>>;
  setRemovalProgress: Dispatch<SetStateAction<unknown>>;
  userId?: string;
}) => {
  const handleDeleteEdital = useCallback(async (edital: UserEdital) => {
    if (!canRunCycleStructuralOperation() || !userId || processingId === edital.id) return;
    setProcessingId(edital.id);
    const subjectIds = Array.isArray(edital.subjectIds) ? edital.subjectIds.filter(id => typeof id === 'string' && id.length > 0) : [];
    try {
      await mergeService.syncCycleAfterRemoval(userId, edital.id, { emitEvents: false });
      await mergeService.cleanupMergesAfterEditalRemoval(userId, edital.id, progress => setRemovalProgress({ editalId: edital.id, ...progress }), { emitEvents: false });
      if (edital.mergedIntoCycle) await discardPendingMerge('all');
      await Promise.allSettled([clearPendingSuggestions(userId)]);
      setPendingSuggestions([]);
      const cycle = await fetchUserCycleForEditalMerge(userId);
      const map = cycle?.unification_map ? parseCycleUnificationMap(cycle.unification_map) : null;
      await deleteEditalData(userId, edital.id, subjectIds, map);
      setEditais(current => current.filter(item => item.id !== edital.id));
      setDeleteConfirm({ isOpen: false, edital: null });
      const name = edital.name.length > 50 ? `${edital.name.substring(0, 50)}...` : edital.name;
      toast.success(`Edital "${name}" removido com sucesso.`);
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'editalDeleted', editalId: edital.id } }));
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'delete', userMessage: 'Erro ao deletar edital.' });
    } finally {
      setProcessingId(null);
      setRemovalProgress(null);
    }
  }, [canRunCycleStructuralOperation, clearPendingSuggestions, discardPendingMerge, processingId, setDeleteConfirm, setEditais, setPendingSuggestions, setProcessingId, setRemovalProgress, userId]);

  const handleUnloadCycle = useCallback(async (edital: UserEdital) => {
    if (!canRunCycleStructuralOperation() || !userId || processingId === edital.id) return false;
    setProcessingId(edital.id);
    try {
      const { cycleDeleted } = await unloadEditalFromCycle({ userId, editalId: edital.id });
      localStorage.removeItem(`user_cycle_cache_${userId}`);
      await discardPendingMerge('all');
      setEditais(current => current.map(item => item.id === edital.id ? { ...item, mergedIntoCycle: false, activeSubjectIds: [] } : item));
      toast.success(cycleDeleted ? `"${edital.name}" removido. Ciclo de estudos encerrado (sem editais ativos).` : `"${edital.name}" removido do ciclo.`);
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      window.dispatchEvent(new CustomEvent('subjectUpdated'));
      await refreshData();
      return true;
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
      return false;
    } finally {
      setProcessingId(null);
      setRemovalProgress(null);
    }
  }, [canRunCycleStructuralOperation, discardPendingMerge, processingId, refreshData, setEditais, setProcessingId, setRemovalProgress, userId]);

  return { handleDeleteEdital, handleUnloadCycle };
};
