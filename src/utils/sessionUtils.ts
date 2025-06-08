
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { getNextReviewStage, getNextReviewDate } from './reviewStageUtils';
import confetti from 'canvas-confetti';

export const completeStudySession = async (
  subjectId: string,
  markedTopics: string[],
  subjects: Subject[]
) => {
  if (markedTopics.length === 0) {
    throw new Error('Selecione pelo menos um tópico para marcar como revisado');
  }

  const updates = markedTopics.map(topicId => {
    const topic = subjects
      .find(s => s.id === subjectId)
      ?.topics.find(t => t.id === topicId);
    
    if (!topic) return null;

    const nextStage = getNextReviewStage(topic.reviewStage || '24h');
    const nextReviewDate = getNextReviewDate(nextStage);

    return supabase
      .from('topics')
      .update({
        review_stage: nextStage,
        next_review: nextReviewDate,
        review_count: (topic.review_count || 0) + 1,
        last_reviewed_at: new Date().toISOString(),
        completed: nextStage === 'Concluído'
      })
      .eq('id', topicId);
  }).filter(Boolean);

  await Promise.all(updates);

  // Check if subject is now completed
  const subject = subjects.find(s => s.id === subjectId);
  if (subject) {
    const allTopicsCompleted = subject.topics.every(topic => {
      if (markedTopics.includes(topic.id)) {
        const nextStage = getNextReviewStage(topic.reviewStage || '24h');
        return nextStage === 'Concluído';
      }
      return topic.reviewStage === 'Concluído';
    });

    if (allTopicsCompleted) {
      await supabase
        .from('subjects')
        .update({ 
          status: 'Concluída',
          completed_at: new Date().toISOString()
        })
        .eq('id', subjectId);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      return { subjectCompleted: true, subjectName: subject.name };
    }
  }

  return { subjectCompleted: false };
};
