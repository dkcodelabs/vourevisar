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
        nextReviewDate = getNextReviewDate('1d');
        break;
      case 1: // Second review
        newReviewStage = '3d';
        nextReviewDate = getNextReviewDate('3d');
        break;
      case 2: // Third review
        newReviewStage = '7d';
        nextReviewDate = getNextReviewDate('7d');
        break;
      case 3: // Fourth review
        newReviewStage = '15d';
        nextReviewDate = getNextReviewDate('15d');
        break;
      case 4: // Fifth review
        newReviewStage = '30d';
        nextReviewDate = getNextReviewDate('30d');
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

  // Record study session
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
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
    allTopicsDominated
  });

  return {
    subjectCompleted,
    subjectName: subject.name,
    topicsUpdated: markedTopicIds.length
  };
};
