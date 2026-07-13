
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { useStudySessionTracking } from './useStudySessionTracking';
import { useCycleState } from './useCycleState';
import {
  calculateNextReview,
  COMPLETION_CONTACT_COUNT,
  formatDateForDB,
  type ReviewIncidenceLevel,
} from '@/utils/calculateNextReview';
import { Topic } from '@/types';
import { registerDualProgress, findSiblingTopicIds } from '@/services/cycleMergeService';
import { syncMergedTopicProgress } from '@/services/topicMergeProgressService';
import { getTopicStrategicIncidence } from '@/utils/studyCycleStrategic';
import { fetchTopicExamDate, getOverdueDays } from '@/services/topicReviewScheduleService';
import { getReviewStage } from '@/utils/reviewStage';
import { getTopicStudySessionContactType } from '@/utils/studySessionContactType';

export const useTopicReview = () => {
  const { user } = useAuth();
  const { refreshData } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const { recordTopicCompletion } = useStudySessionTracking();
  const { userCycle } = useCycleState();
  const cycleId = userCycle?.id;

  // Estado para controlar o modal de dificuldade
  const [difficultyModalData, setDifficultyModalData] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectId: string;
    subjectName: string;
    currentDifficulty: number | null;
    reviewStage: string;
    reviewCount: number;
    isCompleting: boolean;
    duration?: number;
    strategicIncidenceLabel?: string | null;
    strategicIncidenceDescription?: string | null;
  }>({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectId: '',
    subjectName: '',
    currentDifficulty: null,
    reviewStage: '',
    reviewCount: 0,
    isCompleting: false,
    duration: 0,
    strategicIncidenceLabel: null,
    strategicIncidenceDescription: null
  });

  // Nova função para abrir o modal de revisão (SEM marcar ainda)
  const openReviewModal = async (topicId: string, duration?: number) => {
    if (!user) return;

    try {
      // Buscar o tópico atual para obter as métricas atuais
      const { data, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!data) throw new Error('Tópico não encontrado');

      const topic = data as unknown as Topic;
      const strategicIncidence = getTopicStrategicIncidence({
        totalVolume: topic.total_volume ?? null,
      });

      const currentReviewCount = topic.review_count || 0;
      const nextReviewCount = currentReviewCount + 1;
      let reviewStage = '';

      // Determinar verbalização da sessão que será concluída.
      if (currentReviewCount === 0) {
        reviewStage = 'Primeiro Contato';
      } else {
        reviewStage = `Revisão ${currentReviewCount}`;
      }

      // Buscar informações da matéria
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', topic.subject_id)
        .single();

      if (subjectError) {
        throw subjectError;
      }

      setDifficultyModalData({
        isOpen: true,
        topicId: topicId,
        topicName: topic.name,
        subjectId: topic.subject_id || '',
        subjectName: subjectData.name,
        currentDifficulty: topic.difficulty_level ? Number(topic.difficulty_level) : null,
        reviewStage,
        reviewCount: nextReviewCount,
        isCompleting: nextReviewCount >= COMPLETION_CONTACT_COUNT,
        duration,
        strategicIncidenceLabel: strategicIncidence.showToStudent ? strategicIncidence.label : null,
        strategicIncidenceDescription: strategicIncidence.showToStudent
          ? 'Cobrança alta detectada no mapa do edital.'
          : null
      });

    } catch (error) {
      console.error('❌ Erro ao abrir modal de revisão:', error);
      toastManager.error('Erro ao abrir modal de revisão');
    }
  };

  const markTopicAsReviewed = async (topicId: string, difficulty?: number | null, durationOverride?: number, expectedReviewCount?: number) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Buscar o tópico atual
      const { data, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!data) throw new Error('Tópico não encontrado');

      const topic = data as unknown as Topic;

      // --- TRAVA DE CONCORRÊNCIA ---
      if (expectedReviewCount !== undefined) {
        if (topic.review_count > expectedReviewCount) {
          throw new Error("SYNC_ERROR: A revisão já foi atualizada externamente.");
        }
      }

      // Trava de Tempo (debounce)
      if (topic.last_reviewed_at) {
        const lastUpdate = new Date(topic.last_reviewed_at).getTime();
        const nowMs = new Date().getTime();
        if (nowMs - lastUpdate < 10000) {
          throw new Error("SYNC_ERROR: Revisão processada recentemente.");
        }
      }

      // A prova pertence ao edital do tópico. Sem data publicada, o motor segue
      // a janela adaptativa normal e não inventa um horizonte.
      const topicEditalId = topic.edital_id || topic.origin_id || null;
      const examDate = await fetchTopicExamDate(topicEditalId, user.id);

      const newReviewCount = topic.review_count + 1;

      // 1. Mapeamento direto da dificuldade (1=Fácil, 2=Médio, 3=Difícil).
      let numericDifficulty = 2; // Padrão: Médio
      if (difficulty !== undefined && difficulty !== null) {
        numericDifficulty = Math.max(1, Math.min(3, Math.round(difficulty)));
      }

      // 2. Buscar histórico com proteção NULL e cronológica
      const { data: pastReviews } = await supabase
        .from('topic_review_history')
        .select('difficulty_numeric')
        .eq('topic_id', topicId)
        .not('difficulty_numeric', 'is', null)
        .lt('reviewed_at', new Date().toISOString()) // Garante que a de hoje não entra
        .order('reviewed_at', { ascending: false })
        .limit(3);

      let trendDelta: number | null = null;
      let trendLabel: string = 'Sem histórico suficiente';

      if (pastReviews && pastReviews.length >= 2) {
        const sum = pastReviews.reduce((acc, rev) => acc + (rev.difficulty_numeric || 2), 0);
        const mediaPassada = sum / pastReviews.length;

        if (!isNaN(mediaPassada)) {
          trendDelta = numericDifficulty - mediaPassada;
          if (trendDelta >= 0.5) trendLabel = 'Piorando';
          else if (trendDelta <= -0.5) trendLabel = 'Melhorando';
          else trendLabel = 'Estável';
        }
      }

      const incidenceLevel = ['low', 'medium', 'high'].includes(String(topic.incidence_level))
        ? topic.incidence_level as ReviewIncidenceLevel
        : null;
      const overdueDays = getOverdueDays(topic.next_review, new Date());

      // Aplicar o programa adaptativo de quatro revisões.
      const stability = topic.memory_stability || 0;
      const currentInt = topic.current_interval || 0;

      const calcResult = calculateNextReview({
        today: new Date(),
        difficulty: numericDifficulty,
        examDate,
        trendDelta,
        overdueDays,
        incidenceLevel,
        metrics: {
          memoryStability: stability,
          currentInterval: currentInt,
          reviewCount: topic.review_count
        }
      });

      const reviewStage = getReviewStage(newReviewCount);
      const nextReview = calcResult.nextReviewDate
        ? formatDateForDB(calcResult.nextReviewDate)
        : null;
      const isCycleCompleted = calcResult.isProgramCompleted;

      // Preparar dados para atualização na tabela `topics`
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        review_count: newReviewCount,
        next_review: nextReview,
        review_stage: reviewStage,
        completed: isCycleCompleted,
        last_reviewed_at: now,
        difficulty_level: numericDifficulty,
        difficulty_set_at: now,
        // Métricas do programa adaptativo
        memory_stability: calcResult.newMemoryStability,
        current_interval: calcResult.newInterval,
        total_reviews: newReviewCount,
        // ---
        last_session_duration: durationOverride ?? difficultyModalData.duration ?? 0,
      };

      if (topic.review_count === 0 || !topic.first_studied_at) {
        updateData.first_studied_at = now;
      }

      const sessionDuration = durationOverride ?? difficultyModalData.duration ?? 0;
      const historyPayload = {
        user_id: user.id,
        topic_id: topicId,
        edital_id: topic.edital_id || topic.origin_id,
        cycle_id: cycleId,
        review_stage: reviewStage,
        reviewed_at: now,
        study_duration_minutes: sessionDuration > 0 ? sessionDuration : null,
        difficulty_numeric: numericDifficulty,
        memory_stability_after_review: calcResult.newMemoryStability,
        interval_after_review: calcResult.newInterval,
        trend_delta: trendDelta ?? null,
        trend_label: trendLabel
      };

      // Atualizar progresso do tópico clicado e equivalentes em uma RPC transacional.
      let mergedSiblingTopicIds: string[] = [];
      try {
        const syncedTopicIds = await syncMergedTopicProgress({
          userId: user.id,
          topicId,
          updateData,
          historyData: historyPayload,
        });
        mergedSiblingTopicIds = syncedTopicIds.filter(id => id !== topicId);

        const unificationMap = userCycle?.unification_map ?? null;
        await registerDualProgress(topicId, updateData, unificationMap);
      } catch (dualErr) {
        console.error('❌ Falha ao atualizar progresso do tópico:', dualErr);
        throw dualErr;
      }

      try {
        // Fallback legado: topic_merges modernos ja sao registrados pela RPC.
        try {
          const unificationMap = userCycle?.unification_map ?? null;
          const alreadySyncedIds = new Set(mergedSiblingTopicIds);
          const siblingIds = findSiblingTopicIds(topicId, unificationMap)
            .filter(siblingId => !alreadySyncedIds.has(siblingId));
          if (siblingIds.length > 0) {
            const siblingHistoryRows = siblingIds.map(sibId => ({
              ...historyPayload,
              topic_id: sibId,
            }));
            await supabase.from('topic_review_history').insert(siblingHistoryRows);
          }
        } catch (siblingErr) {
          // Non-blocking: sibling history failure shouldn't break the main flow
          console.warn('⚠️ Falha na propagação de histórico (não-bloqueante):', siblingErr);
        }
      } catch (e) {
        console.error("⚠️ Falha vital ao registrar histórico contextual:", e);
        throw e;
      }

      try {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', topic.subject_id)
          .single();

        if (subjectData) {
          await recordTopicCompletion(
            topic.subject_id || '',
            subjectData.name,
            topicId,
            topic.name,
            {
              durationMinutes: durationOverride ?? difficultyModalData.duration,
              cycleId,
              editalId: topic.edital_id || topic.origin_id,
              contactType: getTopicStudySessionContactType({
                firstStudiedAt: topic.first_studied_at,
                previousReviewCount: topic.review_count,
              }),
            },
          );
        }
      } catch (sessionError) {
        console.error('⚠️ Erro ao registrar sessão de estudo:', sessionError);
      }

      // Salvar dificuldade em log explícito
      if (difficulty !== undefined) {
        await supabase
          .from('topics')
          .update({
            difficulty_level: difficulty !== null ? Number(difficulty) : null,
            difficulty_set_at: difficulty ? new Date().toISOString() : null
          })
          .eq('id', topicId);
      }

      // Atualizar status da matéria se tudo completou
      const { data: allTopicsOfSubject } = await supabase
        .from('topics')
        .select('id, completed')
        .eq('subject_id', topic.subject_id);

      if (allTopicsOfSubject && allTopicsOfSubject.length > 0) {
        const allCompleted = allTopicsOfSubject.every(t => t.completed);
        if (allCompleted) {
          await supabase.from('subjects').update({ status: 'Concluída' }).eq('id', topic.subject_id);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('studiesCompleted', { detail: { reason: 'allTopicsCompleted', timestamp: Date.now() } }));
          }, 100);
        }
      }

      await refreshData();

      // Emit events para UI atualizar instantaneamente
      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: { action: 'update', subjectId: topic.subject_id, topicId, source: 'topicReview' }
      }));
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { source: 'topicReview', type: 'topicReview', topicId, reviewStage, completed: isCycleCompleted, timestamp: Date.now() }
      }));

      toastManager.success(
        isCycleCompleted
          ? 'Programa de revisões concluído para este tópico!'
          : 'Revisão adaptativa registrada!',
        { duration: 3000, id: 'review-success' },
      );

    } catch (error) {
      console.error('❌ Erro ao registrar revisão:', error);
      toastManager.error('Erro ao registrar revisão');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openDifficultyModal = (topicId: string, topicName: string, subjectId: string, subjectName: string, currentDifficulty: number | null = null) => {
    setDifficultyModalData({
      isOpen: true,
      topicId,
      topicName,
      subjectId,
      subjectName,
      currentDifficulty,
      reviewStage: '',
      reviewCount: 0,
      isCompleting: false,
      strategicIncidenceLabel: null,
      strategicIncidenceDescription: null
    });
  };

  const closeDifficultyModal = () => {
    setDifficultyModalData({
      isOpen: false,
      topicId: '',
      topicName: '',
      subjectId: '',
      subjectName: '',
      currentDifficulty: null,
      reviewStage: '',
      reviewCount: 0,
      isCompleting: false,
      duration: 0,
      strategicIncidenceLabel: null,
      strategicIncidenceDescription: null
    });
  };

  const submitDifficultyRating = async (difficulty: number | null) => {
    if (!difficultyModalData.topicId) return;

    try {
      const { error } = await supabase
        .from('topics')
        .update({
          difficulty_level: difficulty !== null ? Number(difficulty) : null,
          difficulty_set_at: difficulty ? new Date().toISOString() : null
        })
        .eq('id', difficultyModalData.topicId);

      if (error) throw error;

      if (difficulty) {
        const difficultyLabels: Record<number, string> = {
          1: 'Fácil',
          2: 'Médio',
          3: 'Difícil'
        };
        toastManager.success(`Dificuldade: ${difficultyLabels[difficulty]}`);
      }
      await refreshData();
    } catch (error) {
      console.error('Erro ao salvar dificuldade:', error);
      toastManager.error('Erro ao salvar avaliação de dificuldade');
    }
  };

  return {
    markTopicAsReviewed,
    openReviewModal,
    isLoading,
    difficultyModalData,
    openDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating
  };
};
