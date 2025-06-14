import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';

export const generateNextDay = async (
  userId: string, 
  userCycle: any, 
  subjects: Subject[]
) => {
  console.log('🔄 generateNextDay iniciado:', {
    userId,
    userCycle: {
      ciclo_atual: userCycle?.ciclo_atual,
      disciplinas_do_dia: userCycle?.disciplinas_do_dia
    },
    subjectsCount: subjects.length
  });

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
    s.status !== 'Concluída' &&
    s.topics && s.topics.length > 0
  );

  console.log('🔄 Matérias disponíveis para próximo dia:', {
    totalSubjects: subjects.length,
    cycleSubjects: userCycle.ciclo_atual.length,
    availableSubjects: availableSubjects.length,
    subjectsPerDay,
    availableSubjectNames: availableSubjects.map(s => ({ id: s.id, name: s.name, status: s.status }))
  });

  if (availableSubjects.length === 0) {
    console.log('🏁 Nenhuma matéria disponível - fim do ciclo');
    return { shouldShowNewCycleMessage: true };
  }

  // Selecionar próximas matérias do ciclo_atual, na ordem original
  let nextBatchIds = userCycle.ciclo_atual.filter(id => {
    const s = subjects.find(sub => sub.id === id);
    return (
      s &&
      s.status !== 'Concluída' &&
      s.topics && s.topics.length > 0 &&
      !userCycle.disciplinas_do_dia.includes(id)
    );
  }).slice(0, subjectsPerDay);

  // Se não houver próximas matérias, mas ainda houver matérias não concluídas, reiniciar disciplinas_do_dia
  if (nextBatchIds.length === 0 && availableSubjects.length > 0) {
    nextBatchIds = userCycle.ciclo_atual.filter(id => {
      const s = subjects.find(sub => sub.id === id);
      return (
        s &&
        s.status !== 'Concluída' &&
        s.topics && s.topics.length > 0
      );
    }).slice(0, subjectsPerDay);
  }

  const nextBatch = nextBatchIds.map(id => subjects.find(s => s.id === id));

  console.log('📋 Próximo lote de matérias selecionado (ordem do ciclo):', {
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

  console.log('✅ Ciclo atualizado no banco de dados');

  return { 
    shouldShowNewCycleMessage: false, 
    newDisciplinasoDia: nextBatchIds 
  };
};

export const loadUserCycle = async (userId: string) => {
  console.log('📋 Carregando ciclo do usuário:', userId);
  
  const { data, error } = await supabase
    .from('user_cycles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading user cycle:', error);
    return {
      id: '',
      user_id: userId,
      ciclo_atual: [],
      disciplinas_do_dia: [],
      ciclos_realizados: 0,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }

  if (!data) {
    return {
      id: '',
      user_id: userId,
      ciclo_atual: [],
      disciplinas_do_dia: [],
      ciclos_realizados: 0,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }

  console.log('📋 Ciclo carregado:', data);
  return data;
};
