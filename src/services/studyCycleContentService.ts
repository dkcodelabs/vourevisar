import { supabase } from '@/integrations/supabase/client';

export async function unloadEditalFromCycle(userId: string, editalId: string, subjectIds: string[]) {
  const { data: cycle, error: cycleFetchError } = await supabase.from('user_cycles').select('id, ciclo_atual').eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (cycleFetchError) throw cycleFetchError;
  if (cycle) {
    const currentIds = Array.isArray(cycle.ciclo_atual) ? cycle.ciclo_atual as string[] : [];
    const { error } = await supabase.from('user_cycles').update({ ciclo_atual: currentIds.filter((id) => !subjectIds.includes(id)), atualizado_em: new Date().toISOString() }).eq('id', cycle.id);
    if (error) throw error;
  }
  const { error } = await supabase.from('user_editais').update({ merged_into_cycle: false, active_subject_ids: [] }).eq('id', editalId);
  if (error) throw error;
}
