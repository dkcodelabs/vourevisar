
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

  // Filtrar apenas matérias do ciclo atual que NÃO estão concluídas
  const availableSubjects = subjects.filter(s => 
    userCycle.ciclo_atual.includes(s.id) && 
    s.status !== 'Concluída'
  );

  console.log('🔄 Gerando próximo dia:', {
    totalSubjects: subjects.length,
    cycleSubjects: userCycle.ciclo_atual.length,
    availableSubjects: availableSubjects.length,
    subjectsPerDay,
    availableSubjectNames: availableSubjects.map(s => s.name)
  });

  if (availableSubjects.length === 0) {
    console.log('🏁 Nenhuma matéria disponível - fim do ciclo');
    return { shouldShowNewCycleMessage: true };
  }

  // Ordenar por prioridade e pegar as próximas matérias
  const sortedSubjects = availableSubjects.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  const nextBatch = sortedSubjects.slice(0, Math.min(subjectsPerDay, sortedSubjects.length));
  const nextBatchIds = nextBatch.map(s => s.id);

  console.log('📋 Próximo lote de matérias:', {
    selectedSubjects: nextBatch.map(s => ({ id: s.id, name: s.name, priority: s.priority })),
    nextBatchIds
  });

  const { error } = await supabase
    .from('user_cycles')
    .update({
      disciplinas_do_dia: nextBatchIds,
      atualizado_em: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user cycle:', error);
    throw error;
  }

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
