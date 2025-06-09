
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { getUserSettings } from './userSettingsUtils';

export const generateNextDay = async (
  userId: string, 
  userCycle: any, 
  subjects: Subject[]
) => {
  // Get user settings to determine how many subjects per day
  const userSettings = await getUserSettings(userId);
  const subjectsPerDay = userSettings.subjects_per_day;

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

export const createNewCycleForReactivatedSubjects = async (
  userId: string, 
  subjectIds: string[]
) => {
  console.log('🔄 createNewCycleForReactivatedSubjects - Starting:', { userId, subjectIds });
  
  const userSettings = await getUserSettings(userId);
  const subjectsPerDay = userSettings.subjects_per_day;
  
  // Select first N subjects for today based on user settings
  const dailySubjects = subjectIds.slice(0, Math.min(subjectsPerDay, subjectIds.length));

  console.log('📚 Settings and daily subjects:', { subjectsPerDay, dailySubjects });

  // Use UPSERT to ensure the record is created or updated
  const { data, error } = await supabase
    .from('user_cycles')
    .upsert({
      user_id: userId,
      ciclo_atual: subjectIds,
      disciplinas_do_dia: dailySubjects,
      ciclos_realizados: 0, // Reset cycle count
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating/updating cycle:', error);
    throw error;
  }

  console.log('✅ Cycle created/updated successfully:', data);

  return { 
    dailySubjects, 
    totalCycleSubjects: subjectIds.length,
    cycleData: data
  };
};

export const createCycleForOrphanSubjects = async (userId: string, subjects: Subject[]) => {
  console.log('🔄 createCycleForOrphanSubjects - Starting');
  
  // Find subjects that are "Em Estudo" but not in any cycle
  const orphanSubjects = subjects.filter(s => s.status === 'Em Estudo');
  
  if (orphanSubjects.length === 0) {
    console.log('📚 No orphan subjects found');
    return null;
  }

  console.log('📚 Found orphan subjects:', orphanSubjects.map(s => s.name));

  const subjectIds = orphanSubjects.map(s => s.id);
  
  try {
    const result = await createNewCycleForReactivatedSubjects(userId, subjectIds);
    console.log('✅ Cycle created for orphan subjects:', result);
    return result;
  } catch (error) {
    console.error('❌ Error creating cycle for orphan subjects:', error);
    throw error;
  }
};
