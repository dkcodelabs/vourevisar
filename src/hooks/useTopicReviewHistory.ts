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
        console.warn('⚠️ [useTopicReviewHistory] No topicId provided');
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
          .select('first_studied_at, review_stage, next_review, review_count, last_reviewed_at')
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
  const completedReviewsMap = new Map<string, { date: Date; duration: number }>();
  let totalStudyTime = 0;

  historyData.forEach(entry => {
    if (entry.review_stage !== REVIEW_STAGES.FIRST_CONTACT) {
      const duration = entry.study_duration_minutes || 0;
      completedReviewsMap.set(entry.review_stage, {
        date: new Date(entry.reviewed_at),
        duration
      });
      totalStudyTime += duration;
    }
  });

  // Criar lista de revisões baseada no perfil do usuário
  const reviews: ReviewEntry[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Variável para manter a data base para o cálculo da próxima revisão (Lógica Adaptativa)
  // Inicialmente é o primeiro contato. Conforme as revisões são feitas, a base avança.
  let currentBaseDate = firstContact ? new Date(firstContact) : null;

  reviewStages.forEach((days: number, index: number) => {
    // Converter dias para o formato de stage usado no banco
    const stageKey = days === 1 ? '24h' : `${days}d`;
    const reviewData = completedReviewsMap.get(stageKey);
    const reviewedAt = reviewData?.date;
    const studyDuration = reviewData?.duration;

    // Calcular o intervalo incremental (delta) em relação à etapa anterior
    // Ex: R1(1d) -> delta 1d. R2(7d) -> delta 6d (7-1).
    const prevDays = index > 0 ? reviewStages[index - 1] : 0;
    const intervalDelta = days - prevDays;

    // Calcular data esperada da revisão
    let expectedDate: Date | null = null;

    if (reviewedAt) {
      // Se a revisão já foi feita, ela é o fato concreto.
      // Para fins de exibição "Era: ...", poderíamos querer saber a data original,
      // mas isso exigiria rastrear DUAS linhas do tempo (a ideal e a real).
      // Simplificação: Se já foi feita, não mostramos "Era:", mostramos a data real.
      // E a data real se torna a base para a PRÓXIMA revisão.
    } else {
      // Se está pendente, calculamos quando DEVERIA ser, baseado na última data base conhecia.

      // EXCEÇÃO: Se for EXATAMENTE a próxima revisão pendente (conforme DB), usamos o next_review do banco.
      // Isso garante sincronia com o agendamento real do backend.
      if (topicData?.next_review && index === topicData.review_count - 1) {
        expectedDate = new Date(topicData.next_review);
      } else if (currentBaseDate) {
        // Se não for a imediata (ex: R3 pendente mas estamos em R2), projetamos.
        expectedDate = new Date(currentBaseDate.getTime() + intervalDelta * 24 * 60 * 60 * 1000);
      }
    }

    // Atualizar a base para o próximo loop
    // Se esta revisão foi feita, a próxima conta a partir DAQUI.
    // Se não foi feita (pendente), a próxima conta a partir da data QUE ESTA DEVERIA OCORRER (estimada).
    if (reviewedAt) {
      currentBaseDate = new Date(reviewedAt);
    } else if (expectedDate) {
      currentBaseDate = new Date(expectedDate);
    }

    // Normalizar expectedDate para comparação visual (sem hora)
    const expectedDateOnly = expectedDate
      ? new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate())
      : null;

    // Verificar status visual
    const activeIndex = (topicData?.review_count || 1) - 1;
    const isCurrentStep = index === activeIndex;
    const isPastStep = index < activeIndex; // Deveria estar feito
    const isFutureStep = index > activeIndex; // Não pode estar atrasado

    const isCompleted = !!reviewedAt;
    const isToday = !isCompleted && isCurrentStep && expectedDateOnly && expectedDateOnly.getTime() === today.getTime();

    // SÓ pode estar atrasado se for o passo atual ou anterior (não feito)
    // Passos futuros (dependentes do atual) não podem estar atrasados, pois o prazo deles nem começou
    const isOverdue = !isCompleted && !isToday && !isFutureStep && expectedDateOnly && expectedDateOnly < today;

    const isFuture = !isCompleted && !isToday && !isOverdue; // Logicamente isFutureStep cairá aqui ou se for dia posterior

    // Calcular dias de atraso ou futuro
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
      order: index + 1,
      studyDuration: isCompleted ? (studyDuration || 0) : undefined
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
    completedReviews,
    totalStudyTime
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
