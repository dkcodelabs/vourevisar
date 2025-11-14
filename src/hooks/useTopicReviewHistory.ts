import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  TopicReviewHistory, 
  TopicReviewHistoryEntry, 
  ReviewEntry 
} from '@/types/topic-review-history';
import { 
  REVIEW_STAGE_LABELS, 
  REVIEW_STAGE_ORDER,
  REVIEW_STAGES 
} from '@/types/topic-review-history';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';

/**
 * Hook para buscar e processar o histórico de revisões de um tópico
 */
export const useTopicReviewHistory = (topicId: string, userProfile: ReviewProfile = ReviewProfile.INTERMEDIATE) => {
  const [history, setHistory] = useState<TopicReviewHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!topicId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Buscar histórico de revisões
        const { data: historyData, error: historyError } = await (supabase as any)
          .from('topic_review_history')
          .select('*')
          .eq('topic_id', topicId)
          .order('reviewed_at', { ascending: true });

        if (historyError) throw historyError;

        // Buscar dados do tópico
        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select('first_studied_at, review_stage, next_review, review_count')
          .eq('id', topicId)
          .single();

        if (topicError) throw topicError;



        // Processar histórico
        const processedHistory = processTopicHistory(
          historyData || [],
          topicData,
          userProfile
        );

        setHistory(processedHistory);
      } catch (err) {
        console.error('Erro ao buscar histórico de revisões:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [topicId, userProfile]);

  return { history, isLoading, error };
};

/**
 * Processa o histórico bruto do banco em um formato estruturado
 */
function processTopicHistory(
  historyData: TopicReviewHistoryEntry[],
  topicData: any,
  userProfile: ReviewProfile
): TopicReviewHistory {
  const maxReviews = REVIEW_PROFILES[userProfile].maxReviews;
  const reviewStages = REVIEW_PROFILES[userProfile].intervals as any[];

  // Encontrar primeiro contato
  const firstContactEntry = historyData.find(
    entry => entry.review_stage === REVIEW_STAGES.FIRST_CONTACT
  );
  const firstContact = firstContactEntry 
    ? new Date(firstContactEntry.reviewed_at)
    : topicData?.first_studied_at 
      ? new Date(topicData.first_studied_at)
      : null;

  // Mapear revisões completadas
  const completedReviewsMap = new Map<string, Date>();
  historyData.forEach(entry => {
    if (entry.review_stage !== REVIEW_STAGES.FIRST_CONTACT) {
      completedReviewsMap.set(entry.review_stage, new Date(entry.reviewed_at));
    }
  });



  // Criar lista de revisões baseada no perfil do usuário
  const reviews: ReviewEntry[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  reviewStages.forEach((days: number, index: number) => {
    // Converter dias para o formato de stage usado no banco
    const stageKey = days === 1 ? '24h' : `${days}d`;
    const reviewedAt = completedReviewsMap.get(stageKey);
    
    // Calcular data esperada da revisão
    const expectedDate = firstContact 
      ? new Date(firstContact.getTime() + days * 24 * 60 * 60 * 1000)
      : null;
    
    // Normalizar expectedDate para comparação (sem hora)
    const expectedDateOnly = expectedDate 
      ? new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate())
      : null;
    
    // Verificar status
    const isCompleted = !!reviewedAt;
    const isToday = !isCompleted && expectedDateOnly && expectedDateOnly.getTime() === today.getTime();
    const isOverdue = !isCompleted && !isToday && expectedDateOnly && expectedDateOnly < today;
    const isFuture = !isCompleted && !isToday && !isOverdue;
    
    // Calcular dias
    const daysOverdue = isOverdue && expectedDateOnly
      ? Math.floor((today.getTime() - expectedDateOnly.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    
    const daysUntil = isFuture && expectedDateOnly
      ? Math.ceil((expectedDateOnly.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    
    reviews.push({
      stage: stageKey,
      stageLabel: REVIEW_STAGE_LABELS[stageKey] || `Revisão ${days} dia${days > 1 ? 's' : ''}`,
      reviewedAt: reviewedAt || null,
      isPending: !reviewedAt,
      isCompleted,
      isOverdue: isOverdue || false,
      isToday: isToday || false,
      isFuture: isFuture || false,
      daysOverdue,
      daysUntil,
      expectedDate,
      order: index + 1
    });
  });

  // Calcular próximas revisões pendentes
  const nextReviews = reviews.filter(r => r.isPending);

  // Estatísticas
  const completedReviews = reviews.filter(r => r.isCompleted).length;
  const totalReviews = reviews.length;

  return {
    firstContact,
    reviews,
    nextReviews,
    totalReviews,
    completedReviews
  };
}

/**
 * Hook para registrar uma revisão manualmente (caso necessário)
 */
export const useRegisterReview = () => {
  const registerReview = async (topicId: string, reviewStage: string) => {
    try {
      const { error } = await (supabase as any)
        .from('topic_review_history')
        .insert({
          topic_id: topicId,
          review_stage: reviewStage,
          reviewed_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar revisão:', error);
      return { success: false, error };
    }
  };

  return { registerReview };
};
