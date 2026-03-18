
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

  // CORREÇÃO PRINCIPAL: Seleção sequencial a partir do índice atual
  let nextBatchIds = [];
  const startIndex = userCycle.indice_atual || 0;
  let currentIndex = startIndex;
  let subjectsFound = 0;

  console.log('📍 Iniciando seleção sequencial:', {
    indice_atual: userCycle.indice_atual,
    startIndex,
    cycleLength: userCycle.ciclo_atual.length,
    availableSubjects: availableSubjects.length
  });

  // Selecionar matérias sequencialmente a partir do índice atual
  while (subjectsFound < subjectsPerDay && subjectsFound < availableSubjects.length) {
    const subjectId = userCycle.ciclo_atual[currentIndex];
    const isAvailable = availableSubjects.some(s => s.id === subjectId);

    console.log(`🔍 Verificando matéria ${subjectId} (índice ${currentIndex}):`, {
      isAvailable,
      subjectName: subjects.find(s => s.id === subjectId)?.name || 'NOT_FOUND'
    });

    if (isAvailable) {
      nextBatchIds.push(subjectId);
      subjectsFound++;
      console.log(`✅ Matéria ${subjectId} selecionada (${subjectsFound}/${subjectsPerDay})`);
    }

    // Avançar para o próximo índice (circular)
    currentIndex = (currentIndex + 1) % userCycle.ciclo_atual.length;

    // Evitar loop infinito se der uma volta completa
    if (currentIndex === startIndex && subjectsFound === 0) {
      console.log('⚠️ Nenhuma matéria disponível encontrada em todo o ciclo');
      break;
    }
  }

  const nextBatch = nextBatchIds.map(id => subjects.find(s => s.id === id));

  console.log('📋 Próximo lote de matérias selecionado:', {
    selectedSubjects: nextBatch.map(s => ({ id: s?.id, name: s?.name, priority: s?.priority })),
    nextBatchIds,
    quantidadeSelecionada: nextBatchIds.length,
    quantidadeConfigurada: subjectsPerDay
  });

  // CORREÇÃO: Calcular novo índice baseado na progressão natural
  let newIndex;

  if (nextBatchIds.length === 0) {
    // Se nenhuma matéria foi selecionada, manter o índice atual
    newIndex = startIndex;
  } else {
    // Avançar o índice baseado no número de matérias PROCESSADAS (incluindo indisponíveis)
    // Encontrar a posição da última matéria selecionada no ciclo
    const lastSelectedSubjectId = nextBatchIds[nextBatchIds.length - 1];
    const lastSelectedIndex = userCycle.ciclo_atual.indexOf(lastSelectedSubjectId);
    newIndex = (lastSelectedIndex + 1) % userCycle.ciclo_atual.length;
  }

  console.log('📍 Calculando novo índice:', {
    startIndex,
    selectedSubjects: nextBatchIds.length,
    lastSelectedSubject: nextBatchIds[nextBatchIds.length - 1],
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
    .eq('status', 'active')
    .limit(1);

  if (error) {
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

  const cycleData = data?.[0] || null;

  if (!cycleData) {
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

  console.log('📋 Ciclo carregado:', cycleData);
  return cycleData;
};

export const cleanCycle = (
  currentCycle: string[],
  allSubjects: any[],
  allowedSubjectIds?: Set<string>
): string[] => {
  const allExistantSubjectIds = allSubjects.map(s => s.id);
  
  // Agora remove:
  // 1. Matérias deletadas do banco
  // 2. Matérias órfãs ou de editais descarregados (se a whitelist for fornecida)
  return currentCycle.filter(id => {
    const exists = allExistantSubjectIds.includes(id);
    const isAllowed = allowedSubjectIds ? allowedSubjectIds.has(id) : true;
    return exists && isAllowed;
  });
};
