
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';

export const generateNextDay = async (
  userId: string, 
  userCycle: any, 
  subjects: Subject[]
) => {
  // Get user settings for subjects_per_day
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('subjects_per_day')
    .eq('user_id', userId)
    .single();

  const subjectsPerDay = userSettings?.subjects_per_day || 3;

  const availableSubjects = subjects.filter(s => 
    userCycle.ciclo_atual.includes(s.id) && 
    s.status !== 'Concluída'
  );

  if (availableSubjects.length === 0) {
    return { shouldShowNewCycleMessage: true };
  }

  const nextBatch = availableSubjects.slice(0, Math.min(subjectsPerDay, availableSubjects.length));
  const nextBatchIds = nextBatch.map(s => s.id);

  const { error } = await supabase
    .from('user_cycles')
    .update({
      disciplinas_do_dia: nextBatchIds,
      atualizado_em: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;

  return { 
    shouldShowNewCycleMessage: false, 
    newDisciplinasoDia: nextBatchIds 
  };
};

export const loadUserCycle = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_cycles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading user cycle:', error);
    return null;
  }

  return data;
};
