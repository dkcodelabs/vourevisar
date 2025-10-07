
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { toast } from '@/lib/toast';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useTopicActions = () => {
  const { user } = useAuth();
  const { updateTopic, setSubjects } = useApp();
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});

  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const novo = {
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), topicId]
      };
      console.log('🟢 handleMarkTopicForReview', { subjectId, topicId, tempMarkedTopics: novo });
      return novo;
    });
  };

  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const novo = {
        ...prev,
        [subjectId]: (prev[subjectId] || []).filter(id => id !== topicId)
      };
      console.log('🔴 handleCancelTopicReview', { subjectId, topicId, tempMarkedTopics: novo });
      return novo;
    });
  };

  const markTopicAsReviewed = async (topicId: string, subjects: any[]) => {
    try {
      const { data: topic } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (!topic) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('review_profile')
        .eq('user_id', user.id)
        .single();

      const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const { intervals } = REVIEW_PROFILES[profile];

      let newReviewCount = topic.review_count + 1;
      let reviewStage;
      let nextReview = null;
      let completed = false;

      if (newReviewCount <= intervals.length) {
        const nextInterval = intervals[newReviewCount - 1];
        reviewStage = nextInterval === 1 ? '24h' : `${nextInterval}d`;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
        nextReview = nextReviewDate.toISOString();
      } else {
        reviewStage = 'Concluído';
        nextReview = null;
        completed = true;
      }

      const { error } = await supabase
        .from('topics')
        .update({
          review_count: newReviewCount,
          next_review: nextReview,
          review_stage: reviewStage,
          completed
        })
        .eq('id', topicId);

      if (error) throw error;

      setSubjects(prev => 
        prev.map(subject => ({
          ...subject,
          topics: subject.topics.map(t => 
            t.id === topicId 
              ? {
                  ...t,
                  review_count: newReviewCount,
                  next_review: nextReview,
                  review_stage: reviewStage,
                  completed
                }
              : t
          )
        }))
      );

      const subject = subjects.find(s => s.topics.some(t => t.id === topicId));
      if (subject) {
        const { data: updatedTopics } = await supabase
          .from('topics')
          .select('id, completed')
          .eq('subject_id', subject.id);
        if (updatedTopics && updatedTopics.length > 0) {
          const allCompleted = updatedTopics.every(t => t.completed);
          if (allCompleted && subject.status !== 'Concluída') {
            await supabase
              .from('subjects')
              .update({ status: 'Concluída' })
              .eq('id', subject.id);
            setSubjects(prev =>
              prev.map(s =>
                s.id === subject.id ? { ...s, status: 'Concluída' } : s
              )
            );
          }
        }
      }

      toastManager.success('Revisão registrada com sucesso!', {
        duration: 3000,
        id: 'review-success'
      });
    } catch (error) {
      console.error('Erro ao marcar tópico como revisado:', error);
      toast.error('Erro ao registrar revisão');
    }
  };

  return {
    tempMarkedTopics,
    setTempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    markTopicAsReviewed
  };
};
