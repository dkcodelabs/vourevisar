import { invokeUserRpc } from '@/services/userRpcService';
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

const formatCycleSourceName = (name?: string | null): string => (
  String(name || '').trim().replace(/\s+/g, ' ').toUpperCase()
);

export function buildRemainingCycleName(editais: Array<{ name?: string | null }>): string {
  const names = editais
    .map((edital) => formatCycleSourceName(edital.name))
    .filter(Boolean);

  return ([...new Set(names)].join(' + ') || 'Ciclo de estudos').slice(0, 160);
}

async function syncRemainingCycleName(userId: string): Promise<void> {
  const { data: remainingEditais, error: remainingError } = await supabase
    .from('user_editais')
    .select('name')
    .eq('user_id', userId)
    .eq('merged_into_cycle', true)
    .order('created_at', { ascending: true });

  if (remainingError) throw remainingError;
  if (!remainingEditais || remainingEditais.length === 0) return;

  const nextCycleName = buildRemainingCycleName(remainingEditais);
  const { error: updateError } = await supabase
    .from('user_cycles')
    .update({ name: nextCycleName, atualizado_em: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) throw updateError;
}

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

  if (result.cycle_deleted !== true) {
    try {
      await syncRemainingCycleName(userId);
    } catch (error) {
      console.warn('[cycleUnloadService] Não foi possível sincronizar o nome do ciclo após remover edital.', error);
    }
  }

  return { cycleDeleted: result.cycle_deleted === true };
}
