import { invokeUserRpc } from '@/services/userRpcService';

interface UnloadEditalFromCycleInput {
  userId: string;
  editalId: string;
}

type ArchiveEditalResult = {
  ok?: boolean;
  error?: string;
  cycle_deleted?: boolean;
};

export async function unloadEditalFromCycle({
  userId,
  editalId,
}: UnloadEditalFromCycleInput): Promise<{ cycleDeleted: boolean }> {
  const data = await invokeUserRpc<ArchiveEditalResult | null>('atomic_archive_edital_from_cycle', {
    p_user_id: userId,
    p_edital_id: editalId,
  });

  const result = data as ArchiveEditalResult | null;
  if (result?.ok !== true) {
    throw new Error(result?.error || 'Não foi possível remover o edital do ciclo.');
  }

  return { cycleDeleted: result.cycle_deleted === true };
}
