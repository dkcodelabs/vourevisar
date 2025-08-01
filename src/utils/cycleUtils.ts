
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
  console.log('📋 Matérias por dia configuradas:', subjectsPerDay);

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
    availableSubjectNames: availableSubjects.map(s => ({ id: s.id, name: s.name, status: s.status }))
  });

  if (availableSubjects.length === 0) {
    console.log('🏁 Nenhuma matéria disponível - fim do ciclo');
    
    // Incrementar ciclos_realizados quando ciclo é concluído
    await supabase
      .from('user_cycles')
      .update({
        ciclos_realizados: (userCycle.ciclos_realizados || 0) + 1,
        data_fim_ciclo: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    console.log('🎉 Ciclo concluído! ciclos_realizados incrementado');
    return { shouldShowNewCycleMessage: true };
  }

  // CORREÇÃO PRINCIPAL: Usar o índice_atual para continuar do ponto correto
  let nextBatchIds = [];
  const startIndex = userCycle.indice_atual || 0;

  console.log('📍 Usando índice atual do ciclo:', {
    indice_atual: userCycle.indice_atual,
    startIndex,
    cycleLength: userCycle.ciclo_atual.length
  });

  console.log('📍 Índice de início no ciclo:', startIndex);

  // Iterar pelo ciclo a partir do índice de início
  for (let i = 0; i < userCycle.ciclo_atual.length && nextBatchIds.length < subjectsPerDay; i++) {
    const currentIndex = (startIndex + i) % userCycle.ciclo_atual.length;
    const subjectId = userCycle.ciclo_atual[currentIndex];
    
    // Verificar se a matéria está disponível
    const isAvailable = availableSubjects.some(s => s.id === subjectId);
    
    console.log(`🔍 Verificando matéria ${subjectId} (índice ${currentIndex}):`, {
      isAvailable,
      subjectName: subjects.find(s => s.id === subjectId)?.name || 'NOT_FOUND'
    });
    
    if (isAvailable) {
      nextBatchIds.push(subjectId);
      console.log(`✅ Matéria ${subjectId} adicionada ao próximo lote (${nextBatchIds.length}/${subjectsPerDay})`);
    }
  }

  // Se não conseguiu preencher o lote completo, tentar pegar matérias do início do ciclo
  if (nextBatchIds.length < subjectsPerDay && availableSubjects.length > nextBatchIds.length) {
    console.log('🔄 Tentando completar lote com matérias do início do ciclo...');
    
    for (const subjectId of userCycle.ciclo_atual) {
      if (nextBatchIds.length >= subjectsPerDay) break;
      
      const isAvailable = availableSubjects.some(s => s.id === subjectId);
      const notInBatch = !nextBatchIds.includes(subjectId);
      
      if (isAvailable && notInBatch) {
        nextBatchIds.push(subjectId);
        console.log(`✅ Matéria ${subjectId} adicionada para completar lote (${nextBatchIds.length}/${subjectsPerDay})`);
      }
    }
  }

  const nextBatch = nextBatchIds.map(id => subjects.find(s => s.id === id));

  console.log('📋 Próximo lote de matérias selecionado:', {
    selectedSubjects: nextBatch.map(s => ({ id: s?.id, name: s?.name, priority: s?.priority })),
    nextBatchIds,
    quantidadeSelecionada: nextBatchIds.length,
    quantidadeConfigurada: subjectsPerDay
  });

  // Calcular novo índice para a próxima seleção
  const newIndex = nextBatchIds.length > 0 
    ? (startIndex + nextBatchIds.length) % userCycle.ciclo_atual.length 
    : startIndex;

  console.log('📍 Atualizando índice atual:', {
    startIndex,
    selectedSubjects: nextBatchIds.length,
    newIndex
  });

  let updateData: any = {
    disciplinas_do_dia: nextBatchIds,
    indice_atual: newIndex,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await supabase
    .from('user_cycles')
    .update(updateData)
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
      indice_atual: 0,
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
      indice_atual: 0,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }

  console.log('📋 Ciclo carregado:', data);
  return data;
};
