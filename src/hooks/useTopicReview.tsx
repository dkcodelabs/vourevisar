
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useTopicReview = () => {
  const { user } = useAuth();
  const { refreshData } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const markTopicAsReviewed = async (topicId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('🔵 markTopicAsReviewed iniciado para topicId:', topicId);

      // Buscar o tópico atual
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Tópico não encontrado');

      console.log('🔵 Tópico encontrado:', topic);

      // Buscar configurações do usuário
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('review_profile')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const { intervals, maxReviews } = REVIEW_PROFILES[profile];

      let newReviewCount = topic.review_count + 1;
      let reviewStage;
      let nextReview = null;
      let completed = false;

      console.log('🔵 Calculando próximo estágio:', {
        newReviewCount,
        maxReviews,
        intervalsLength: intervals.length,
        intervals
      });

      // Calcular próximo estágio de revisão usando maxReviews
      if (newReviewCount <= maxReviews) {
        const nextInterval = intervals[newReviewCount - 1];
        reviewStage = nextInterval === 1 ? '24h' : `${nextInterval}d`;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
        nextReview = nextReviewDate.toISOString();
        
        // Se é a última revisão do perfil, marcar como concluído
        completed = (newReviewCount === maxReviews);
      } else {
        // Quando excede o número máximo de revisões, marca como concluído
        reviewStage = 'Concluído';
        nextReview = null;
        completed = true;
      }

      console.log('🔵 Resultado do cálculo:', {
        reviewStage,
        nextReview,
        completed,
        newReviewCount
      });

      // Preparar dados para atualização
      const now = new Date().toISOString();
      const updateData: any = {
        review_count: newReviewCount,
        next_review: nextReview,
        review_stage: reviewStage,
        completed,
        last_reviewed_at: now
      };

      // Se é a primeira revisão, definir first_studied_at
      if (topic.review_count === 0 || !topic.first_studied_at) {
        updateData.first_studied_at = now;
        console.log('🔵 Primeira revisão - definindo first_studied_at:', now);
      }

      console.log('🔵 Dados para atualização:', updateData);

      // Atualizar o tópico no banco
      const { error: updateError } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId);

      if (updateError) throw updateError;

      console.log('✅ Tópico atualizado com sucesso');

      // Verificar se todas as revisões da matéria foram concluídas
      const { data: allTopicsOfSubject, error: allTopicsError } = await supabase
        .from('topics')
        .select('id, completed')
        .eq('subject_id', topic.subject_id);

      if (allTopicsError) throw allTopicsError;

      if (allTopicsOfSubject && allTopicsOfSubject.length > 0) {
        const allCompleted = allTopicsOfSubject.every(t => t.completed);
        
        if (allCompleted) {
          console.log('🔵 Todas as revisões da matéria concluídas, atualizando status da matéria');
          await supabase
            .from('subjects')
            .update({ status: 'Concluída' })
            .eq('id', topic.subject_id);
        }
      }

      // Não chamar refreshData aqui se usado dentro de uma sessão
      // O refresh será feito pelo componente que gerencia a sessão
      console.log('🔵 Revisão processada sem refresh automático');
      
      // Disparar evento para atualizar estatísticas imediatamente
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      
      toastManager.success('Revisão registrada com sucesso!', {
        duration: 3000,
        id: 'review-success'
      });
      
    } catch (error) {
      console.error('❌ Erro ao marcar tópico como revisado:', error);
      toastManager.error('Erro ao registrar revisão');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    markTopicAsReviewed,
    isLoading
  };
};
