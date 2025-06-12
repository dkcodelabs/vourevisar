import { Subject } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getNextReviewDate } from './reviewStageUtils';

export const completeStudySession = async (subjectId: string, markedTopicIds: string[], subjects: Subject[]) => {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) {
    throw new Error('Matéria não encontrada');
  }

  console.log('🎯 Completando sessão de estudo:', {
    subjectId,
    subjectName: subject.name,
    markedTopicIds,
    currentStatus: subject.status
  });

  // Update marked topics
  for (const topicId of markedTopicIds) {
    const topic = subject.topics.find(t => t.id === topicId);
    if (!topic) continue;

    const currentReviewCount = topic.reviewCount || 0;
    const newReviewCount = currentReviewCount + 1;
    
    let newReviewStage: string;
    let nextReviewDate: Date | null = null;

    // Determine new review stage
    switch (currentReviewCount) {
      case 0: // First review
        newReviewStage = '1d';
        nextReviewDate = new Date(getNextReviewDate('1d'));
        break;
      case 1: // Second review
        newReviewStage = '3d';
        nextReviewDate = new Date(getNextReviewDate('3d'));
        break;
      case 2: // Third review
        newReviewStage = '7d';
        nextReviewDate = new Date(getNextReviewDate('7d'));
        break;
      case 3: // Fourth review
        newReviewStage = '15d';
        nextReviewDate = new Date(getNextReviewDate('15d'));
        break;
      case 4: // Fifth review
        newReviewStage = '30d';
        nextReviewDate = new Date(getNextReviewDate('30d'));
        break;
      default: // Sixth review and beyond
        newReviewStage = 'Concluído';
        nextReviewDate = null;
        break;
    }

    console.log('🔄 Atualizando tópico:', {
      topicId,
      topicName: topic.name,
      currentReviewCount,
      newReviewCount,
      newReviewStage,
      nextReviewDate
    });

    // Update topic in database
    const { error } = await supabase
      .from('topics')
      .update({
        review_count: newReviewCount,
        review_stage: newReviewStage,
        next_review: nextReviewDate?.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        completed: true,
        first_studied_at: topic.lastReviewedAt ? undefined : new Date().toISOString()
      })
      .eq('id', topicId);

    if (error) {
      console.error('Error updating topic:', error);
      throw new Error(`Erro ao atualizar tópico: ${error.message}`);
    }
  }

  // Verificar se todos os tópicos da matéria estão dominados
  const allTopicsDominated = subject.topics.every(topic => {
    // Se foi marcado nesta sessão, considera como dominado se chegou no final
    if (markedTopicIds.includes(topic.id)) {
      const newReviewCount = (topic.reviewCount || 0) + 1;
      return newReviewCount >= 5; // 5+ reviews = Concluído
    }
    // Se não foi marcado, verifica o estado atual
    return topic.reviewStage === 'Concluído';
  });

  let subjectCompleted = false;

  // Se todos os tópicos estão dominados, marcar a matéria como concluída
  if (allTopicsDominated && subject.status !== 'Concluída') {
    console.log('🎉 Todos os tópicos dominados - marcando matéria como concluída');
    
    const { error: subjectError } = await supabase
      .from('subjects')
      .update({
        status: 'Concluída',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId);

    if (subjectError) {
      console.error('Error updating subject status:', subjectError);
      throw new Error(`Erro ao atualizar status da matéria: ${subjectError.message}`);
    }

    subjectCompleted = true;
  }

  // SEMPRE remover a matéria da lista diária e do ciclo ao concluir a sessão
  console.log('🔄 Removendo matéria da lista diária e do ciclo após sessão');
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    // Buscar o ciclo atual
    const { data: userCycle, error: cycleError } = await supabase
      .from('user_cycles')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (cycleError) {
      console.error('Error fetching user cycle:', cycleError);
    } else if (userCycle) {
      // Remover a matéria da lista do dia e do ciclo
      const updatedDisciplinasoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      const updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
      let updateObj: any = {
        disciplinas_do_dia: updatedDisciplinasoDia,
        ciclo_atual: updatedCicloAtual,
        atualizado_em: new Date().toISOString()
      };
      let ciclosRealizados = userCycle.ciclos_realizados || 0;
      // Se ciclo_atual ficou vazio, reiniciar ciclo e incrementar ciclos_realizados
      if (updatedCicloAtual.length === 0) {
        ciclosRealizados += 1;
        // Buscar matérias disponíveis para novo ciclo
        const { data: allSubjects } = await supabase
          .from('subjects')
          .select('id, status, user_id')
          .eq('user_id', user.user.id);
        let availableSubjects = [];
        if (allSubjects && allSubjects.length > 0) {
          for (const subj of allSubjects) {
            const { data: topicsData } = await supabase
              .from('topics')
              .select('id')
              .eq('subject_id', subj.id);
            if (topicsData && topicsData.length > 0) {
              availableSubjects.push(subj.id);
            }
          }
        }
        // Definir matérias do novo ciclo
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', user.user.id)
          .single();
        const subjectsPerDay = userSettings?.subjects_per_day || 3;
        const firstDaySubjects = availableSubjects.slice(0, subjectsPerDay);
        updateObj.ciclo_atual = availableSubjects;
        updateObj.disciplinas_do_dia = firstDaySubjects;
        updateObj.ciclos_realizados = ciclosRealizados;
        updateObj.data_inicio_ciclo = new Date().toISOString();
      }
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update(updateObj)
        .eq('user_id', user.user.id);
      if (updateError) {
        console.error('Error updating user cycle:', updateError);
        throw new Error(`Erro ao atualizar ciclo: ${updateError.message}`);
      } else {
        console.log('✅ Matéria removida da lista diária, do ciclo e ciclo atualizado se necessário:', {
          subjectId,
          updateObj
        });
      }
    }

    // Record study session
    const { error: sessionError } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.user.id,
        session_date: new Date().toISOString().split('T')[0],
        topics_studied: markedTopicIds.length,
        subjects_worked: [subjectId],
        session_duration_minutes: 30 // Default duration
      });

    if (sessionError) {
      console.error('Error recording study session:', sessionError);
      // Don't throw error here as the main operation succeeded
    }
  }

  console.log('✅ Sessão de estudo completada:', {
    subjectCompleted,
    topicsUpdated: markedTopicIds.length,
    allTopicsDominated,
    subjectRemovedFromDaily: true
  });

  return {
    subjectCompleted,
    subjectName: subject.name,
    topicsUpdated: markedTopicIds.length,
    subjectRemovedFromDaily: true
  };
};
