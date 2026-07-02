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
import type { Tables } from '@/integrations/supabase/types';

type TopicScheduleRow = Pick<
  Tables<'topics'>,
  'first_studied_at' | 'review_stage' | 'next_review' | 'review_count' | 'last_reviewed_at' | 'completed'
>;

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
        console.warn('⚠️ [useTopicReviewHistory] No topicId provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Buscar histórico de revisões
        const { data: historyData, error: historyError } = await supabase
          .from('topic_review_history')
          .select('*, difficulty_numeric, trend_label, trend_delta')
          .eq('topic_id', topicId)
          .order('reviewed_at', { ascending: true });

        if (historyError) throw historyError;

        // Buscar dados do tópico
        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select('first_studied_at, review_stage, next_review, review_count, last_reviewed_at, completed')
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
  topicData: TopicScheduleRow,
  userProfile: ReviewProfile
): TopicReviewHistory {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Encontrar primeiro contato
  const firstContactEntry = historyData.find(
    entry => entry.review_stage === REVIEW_STAGES.FIRST_CONTACT
  );
  const firstContact = firstContactEntry
    ? new Date(firstContactEntry.reviewed_at)
    : topicData?.first_studied_at
      ? new Date(topicData.first_studied_at)
      : null;

  let totalStudyTime = 0;
  const reviews: ReviewEntry[] = [];
  let completedCount = 0;

  historyData.forEach((entry) => {
    if (entry.review_stage !== REVIEW_STAGES.FIRST_CONTACT) {
      completedCount++;
      const duration = entry.study_duration_minutes || 0;
      totalStudyTime += duration;
      const reviewedAt = new Date(entry.reviewed_at);

      reviews.push({
        stage: completedCount.toString(),
        stageLabel: `Revisão ${completedCount}`,
        reviewedAt: reviewedAt,
        isPending: false,
        isCompleted: true,
        isOverdue: false,
        isToday: false,
        isFuture: false,
        daysOverdue: 0,
        daysUntil: 0,
        expectedDate: reviewedAt, // real iteration fact
        order: completedCount,
        studyDuration: duration
      });
    }
  });

  // Adicionar única iteração pendente futura de acordo com base adaptativa real
  if (topicData?.next_review && (!topicData.completed && topicData.review_stage !== 'Consolidado')) {
    const nextReviewDate = new Date(topicData.next_review);
    const expectedDateOnly = new Date(nextReviewDate.getFullYear(), nextReviewDate.getMonth(), nextReviewDate.getDate());

    const isToday = expectedDateOnly.getTime() === today.getTime();
    const isOverdue = expectedDateOnly < today;
    const isFuture = expectedDateOnly > today;

    const daysOverdue = isOverdue
      ? Math.floor((today.getTime() - expectedDateOnly.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    const daysUntil = isFuture
      ? Math.ceil((expectedDateOnly.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    reviews.push({
      stage: (completedCount + 1).toString(),
      stageLabel: `Revisão ${completedCount + 1}`,
      reviewedAt: null,
      isPending: true,
      isCompleted: false,
      isOverdue,
      isToday,
      isFuture,
      daysOverdue,
      daysUntil,
      expectedDate: nextReviewDate,
      order: completedCount + 1,
    });
  }

  const nextReviews = reviews.filter(r => r.isPending);
  const completedReviews = completedCount;
  const totalReviews = reviews.length;

  // Extrair a trend_label mais recente (último registro com valor não nulo)
  const latestTrendEntry = [...historyData].reverse().find(
    (entry) => entry.trend_label != null
  );
  const latestTrendLabel: string = latestTrendEntry?.trend_label ?? 'Sem histórico suficiente';
  const latestTrendDelta: number | null = latestTrendEntry?.trend_delta ?? null;

  return {
    firstContact,
    reviews,
    nextReviews,
    totalReviews,
    completedReviews,
    totalStudyTime,
    latestTrendLabel,
    latestTrendDelta,
    // Entradas brutas para o gráfico de evolução
    rawEntries: historyData.filter(e => e.difficulty_numeric != null)
  };
}

/**
 * Hook para registrar uma revisão manualmente (caso necessário)
 */
export const useRegisterReview = () => {
  const registerReview = async (topicId: string, reviewStage: string) => {
    try {
      const { error } = await supabase
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
