import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { useStudySessionTracking } from './useStudySessionTracking';
import { calculateNextReview, formatDateForDB, describeCalculation } from '@/utils/calculateNextReview';

export const useTopicReview = () => {
  const { user } = useAuth();
  const { refreshData } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const { recordTopicCompletion } = useStudySessionTracking();

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
    duration: 0
  });

  // Nova função para abrir o modal de revisão (SEM marcar ainda)
  const openReviewModal = async (topicId: string, duration?: number) => {
    if (!user) return;

    try {
      console.log('🔵 openReviewModal chamado para topicId:', topicId);

      // Buscar o tópico atual para obter as métricas atuais
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Tópico não encontrado');

      const currentReviewCount = topic.review_count || 0;
      const nextReviewCount = currentReviewCount + 1;
      let reviewStage = '';

      // Determinar verbalização do estágio para exibição na UI
      if (currentReviewCount === 0) {
        reviewStage = 'Primeiro Contato';
      } else {
        reviewStage = `Revisão Adaptativa #${currentReviewCount}`;
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
        subjectId: topic.subject_id,
        subjectName: subjectData.name,
        currentDifficulty: topic.difficulty_level ? Number(topic.difficulty_level) : null,
        reviewStage,
        reviewCount: nextReviewCount,
        isCompleting: false, // O novo sistema é perpétuo/infinito, finalização é manual se desejado no futuro.
        duration
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
      console.log('🔵 markTopicAsReviewed iniciado para topicId:', topicId);

      // Buscar o tópico atual
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Tópico não encontrado');

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

      // Buscar configurações do usuário (incluindo perfil e data_prova)
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('review_profile, data_prova_meta')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      // Garantir compatibilidade fazendo parsing se vier do DB como string
      const profileStr = settings?.review_profile as string | undefined;
      const profile = profileStr && Object.values(ReviewProfile).includes(profileStr as ReviewProfile)
        ? (profileStr as ReviewProfile)
        : ReviewProfile.INTERMEDIATE;

      const examDate = (settings as Record<string, unknown>)?.data_prova_meta
        ? new Date((settings as Record<string, unknown>).data_prova_meta + 'T00:00:00')
        : null;

      const newReviewCount = topic.review_count + 1;

      // 1. Converter dificuldade recebida (1-5 ou 1-3 do UI legado) para o padrão interno (1=Difícil, 2=Médio, 3=Fácil).
      // Assumindo fallback 2 (Médio). Se vier 1 (estrela) = Muito Difícil/Difícil -> 1.
      // Se vier 2 = Médio -> 2. Se vier 3 = Fácil -> 3.
      // Vamos normalizar.
      let numericDifficulty = 2;
      if (difficulty !== undefined && difficulty !== null) {
        if (difficulty <= 1) numericDifficulty = 1; // Difícil
        else if (difficulty === 2) numericDifficulty = 2; // Médio
        else numericDifficulty = 3; // Fácil/Muito Fácil
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
          if (trendDelta >= 0.5) trendLabel = 'Melhorando';
          else if (trendDelta <= -0.5) trendLabel = 'Piorando';
          else trendLabel = 'Estável';
        }
      }

      // Aplicar o algoritmo Ebbinghaus Adaptativo
      // Preparar os parâmetros lendo as colunas do DB. Mapear default 0 onde null.
      const stability = topic.memory_stability || 0;
      const currentInt = topic.current_interval || 0;

      const calcResult = calculateNextReview({
        today: new Date(),
        profile,
        difficulty: numericDifficulty,
        examDate,
        trendDelta,
        metrics: {
          memoryStability: stability,
          currentInterval: currentInt,
          reviewCount: topic.review_count
        }
      });

      console.log('🔵 SRS Calculation:', describeCalculation(calcResult));

      const reviewStage = newReviewCount === 1 ? 'Primeiro Contato' : `Revisão Adaptativa #${newReviewCount}`;
      const nextReview = formatDateForDB(calcResult.nextReviewDate);

      // Se alcançou o máximo do ciclo (usado para mostrar concluído visivelmente mesmo o srs rodando)
      const isCycleCompleted = newReviewCount >= REVIEW_PROFILES[profile].maxReviews;

      // Preparar dados para atualização na tabela `topics`
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        review_count: newReviewCount,
        next_review: nextReview,
        review_stage: reviewStage,
        completed: isCycleCompleted,
        last_reviewed_at: now,
        // Novos campos SRS Ebbinghaus
        memory_stability: calcResult.newMemoryStability,
        current_interval: calcResult.newInterval,
        // ---
        last_session_duration: durationOverride ?? difficultyModalData.duration ?? 0,
      };

      if (topic.review_count === 0 || !topic.first_studied_at) {
        updateData.first_studied_at = now;
      }

      // Atualizar o tópico no banco
      const { data: updatedTopic, error: updateError } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId)
        .select('id, review_count, review_stage, next_review, completed')
        .single();

      if (updateError) throw updateError;

      // Registrar histórico no DB (Usando insert manual em vez de esperar trigger, a pedido PROMPT 3)
      const sessionDuration = durationOverride ?? difficultyModalData.duration ?? 0;
      try {
        const { error: histError } = await supabase.from('topic_review_history').insert({
          topic_id: topicId,
          review_stage: reviewStage,
          reviewed_at: now,
          study_duration_minutes: sessionDuration > 0 ? sessionDuration : null,
          difficulty_numeric: numericDifficulty,
          memory_stability_after_review: calcResult.newMemoryStability,
          interval_after_review: calcResult.newInterval,
          trend_delta: trendDelta ?? null,
          trend_label: trendLabel
        });
        if (histError) throw histError;
      } catch (e) {
        console.error("⚠️ Falha vital: Colunas de histórico (prompt 3) provavelmente não existem no DB.", e);
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
            topic.subject_id,
            subjectData.name,
            topicId,
            topic.name,
            undefined,
            durationOverride ?? difficultyModalData.duration
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
          // ... Emitir os alertas de curso finalizado...
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

      toastManager.success('Revisão adaptativa registrada!', { duration: 3000, id: 'review-success' });

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
      isCompleting: false
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
      duration: 0
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
          3: 'Difícil',
          4: 'Difícil',
          5: 'Muito Difícil'
        };
        const stars = '⭐'.repeat(difficulty);
        toastManager.success(`Dificuldade: ${difficultyLabels[difficulty]} ${stars}`);
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
