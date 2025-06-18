
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

  // Filtrar apenas matérias do ciclo atual que NÃO estão concluídas E que têm tópicos não revisados
  const availableSubjects = subjects.filter(s => 
    userCycle.ciclo_atual.includes(s.id) && 
    s.status !== 'Concluída' &&
    s.topics && s.topics.length > 0 &&
    s.topics.some(t => t.review_count === 0) // Só matérias com tópicos não revisados
  );

  console.log('🔄 Matérias disponíveis para próximo dia:', {
    totalSubjects: subjects.length,
    cycleSubjects: userCycle.ciclo_atual.length,
    availableSubjects: availableSubjects.length,
    subjectsPerDay,
    availableSubjectNames: availableSubjects.map(s => ({ id: s.id, name: s.name, status: s.status })),
    ordem_atual_ciclo: userCycle.ciclo_atual.map(id => {
      const s = subjects.find(sub => sub.id === id);
      return s ? { id, name: s.name, position: userCycle.ciclo_atual.indexOf(id) } : { id, name: 'NOT_FOUND', position: userCycle.ciclo_atual.indexOf(id) };
    })
  });

  if (availableSubjects.length === 0) {
    console.log('🏁 Nenhuma matéria disponível - fim do ciclo');
    return { shouldShowNewCycleMessage: true };
  }

  // IMPORTANTE: Selecionar próximas matérias respeitando a ORDEM do ciclo_atual
  // e que não estão no dia atual
  let nextBatchIds = [];
  for (const subjectId of userCycle.ciclo_atual) {
    if (nextBatchIds.length >= subjectsPerDay) break;
    
    // Verificar se a matéria está disponível e não está no dia atual
    const isAvailable = availableSubjects.some(s => s.id === subjectId);
    const isNotInCurrentDay = !userCycle.disciplinas_do_dia.includes(subjectId);
    
    if (isAvailable && isNotInCurrentDay) {
      nextBatchIds.push(subjectId);
    }
  }

  // Se não houver próximas matérias, mas ainda houver matérias não concluídas, reiniciar seleção
  if (nextBatchIds.length === 0 && availableSubjects.length > 0) {
    nextBatchIds = userCycle.ciclo_atual.filter(id => {
      const s = subjects.find(sub => sub.id === id);
      return (
        s &&
        s.status !== 'Concluída' &&
        s.topics && s.topics.length > 0 &&
        s.topics.some(t => t.review_count === 0) // Só matérias com tópicos não revisados
      );
    }).slice(0, subjectsPerDay);
  }

  const nextBatch = nextBatchIds.map(id => subjects.find(s => s.id === id));

  console.log('📋 Próximo lote de matérias selecionado (respeitando ordem do ciclo):', {
    selectedSubjects: nextBatch.map(s => ({ id: s?.id, name: s?.name, priority: s?.priority })),
    nextBatchIds,
    ordem_selecionada: nextBatchIds.map((id, index) => ({
      position: index + 1,
      id,
      name: subjects.find(s => s.id === id)?.name || 'NOT_FOUND',
      posicao_no_ciclo: userCycle.ciclo_atual.indexOf(id)
    }))
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
      materias_pendentes: [],
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
      materias_pendentes: [],
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
