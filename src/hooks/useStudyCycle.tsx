import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { toast } from '@/lib/toast';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useStudyCycle = () => {
  const { user } = useAuth();
  const { subjects, updateTopic, setSubjects } = useApp();
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});

  // Função para marcar tópico para revisão (copiada de useTopicActions)
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

  // Função para cancelar revisão de tópico (copiada de useTopicActions)
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

  // Função para marcar tópico como revisado (copiada de useTopicActions)
  const markTopicAsReviewed = async (topicId: string) => {
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
        .eq('user_id', user?.id)
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

  // Função para concluir sessão (integrada com sistema de progresso diário)
  const handleCompleteSession = async (subjectId: string, saveStudySession?: (session: any) => Promise<boolean>) => {
    console.log('🔵 handleCompleteSession INICIADO:', {
      subjectId,
      tempMarkedTopics: tempMarkedTopics[subjectId] || []
    });

    try {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        toast.error('Matéria não encontrada');
        return;
      }

      const topicsToReview = tempMarkedTopics[subjectId] || [];
      
      if (topicsToReview.length > 0) {
        // Processar tópicos marcados para revisão
        for (const topicId of topicsToReview) {
          await markTopicAsReviewed(topicId);
        }
        
        // Limpar tópicos marcados
        setTempMarkedTopics(prev => ({
          ...prev,
          [subjectId]: []
        }));
        
        toast.success('Sessão concluída com sucesso!');
      } else {
        toast.success('Matéria pulada!');
      }

      // INTEGRAÇÃO: Salvar sessão de estudo no sistema de progresso diário
      if (saveStudySession && topicsToReview.length > 0) {
        const session = {
          subjectId: subject.id,
          subjectName: subject.name,
          cyclePosition: 0, // Será calculado no hook
          topicsStudied: topicsToReview,
          completedAt: new Date().toISOString()
        };

        console.log('💾 Salvando sessão de estudo:', session);
        const saved = await saveStudySession(session);
        
        if (saved) {
          console.log('✅ Sessão salva com sucesso - progresso diário atualizado');
        } else {
          console.warn('⚠️ Falha ao salvar sessão - progresso diário pode não estar atualizado');
        }
      }
      
      // Disparar eventos para atualizar componentes
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { 
          subjectId, 
          subjectName: subject.name,
          topicsStudied: topicsToReview.length,
          completed: true
        }
      }));

      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { 
          subjectId, 
          subjectName: subject.name,
          topicsStudied: topicsToReview.length
        }
      }));

    } catch (error) {
      console.error('❌ Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  return {
    tempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleCompleteSession,
    markTopicAsReviewed
  };
};