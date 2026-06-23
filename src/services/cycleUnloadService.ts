import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase.rpc('atomic_archive_edital_from_cycle', {
    p_user_id: userId,
    p_edital_id: editalId,
  });

  if (error) throw error;

  const result = data as ArchiveEditalResult | null;
  if (result?.ok !== true) {
    throw new Error(result?.error || 'Não foi possível remover o edital do ciclo.');
  }

  return { cycleDeleted: result.cycle_deleted === true };
}
