import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

export async function fetchActiveUserCycle(userId: string) {
  const { data, error } = await supabase.from('user_cycles').select('*').eq('user_id', userId).eq('status', 'active').limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function updateUserCycle(userId: string, update: TablesUpdate<'user_cycles'>) {
  const { error } = await supabase.from('user_cycles').update(update).eq('user_id', userId);
  if (error) throw error;
}

export async function completeUserCycle(userId: string, cyclesCompleted: number) {
  return updateUserCycle(userId, {
    ciclos_realizados: cyclesCompleted,
    data_fim_ciclo: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
}

export async function fetchUserSubjectsPerDay(userId: string) {
  return supabase.from('user_settings').select('subjects_per_day').eq('user_id', userId).single();
}
