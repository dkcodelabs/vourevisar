
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

      // Buscar o tópico atual
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Tópico não encontrado');

      // Buscar configurações do usuário
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('review_profile')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const { intervals, maxReviews } = REVIEW_PROFILES[profile];

      // Calcular PREVIEW do que seria o próximo estágio
      const currentReviewCount = topic.review_count;
      const nextReviewCount = currentReviewCount + 1;
      let reviewStage = '';
      let isCompleting = false;

      // Determinar o stage que está FAZENDO AGORA
      if (currentReviewCount === 0) {
        reviewStage = 'Primeiro Contato';
      } else if (currentReviewCount >= 1 && nextReviewCount <= intervals.length + 1) {
        const currentReviewIndex = currentReviewCount - 1;
        const currentInterval = intervals[currentReviewIndex];
        reviewStage = currentInterval === 1 ? '24h' : `${currentInterval}d`;

        if (nextReviewCount === intervals.length + 1) {
          isCompleting = true;
        }
      } else {
        reviewStage = 'Concluído';
        isCompleting = true;
      }

      // Buscar informações da matéria
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', topic.subject_id)
        .single();

      if (subjectError) {
        console.error('❌ Erro ao buscar dados da matéria:', subjectError);
        throw subjectError;
      }

      console.log('🌟 ABRINDO MODAL DE REVISÃO:', {
        topicId,
        topicName: topic.name,
        subjectName: subjectData.name,
        reviewStage,
        reviewCount: nextReviewCount,
        isCompleting
      });

      // Abrir o modal COM as informações de preview
      setDifficultyModalData({
        isOpen: true,
        topicId: topicId,
        topicName: topic.name,
        subjectId: topic.subject_id,
        subjectName: subjectData.name,
        currentDifficulty: topic.difficulty_level ? Number(topic.difficulty_level) : null,
        reviewStage,
        reviewCount: nextReviewCount,
        isCompleting,
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

      // Buscar o tópico atual (FORCE FETCH para garantir dados frescos)
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Tópico não encontrado');

      // --- TRAVA DE CONCORRÊNCIA (Optimistic Locking) ---
      if (expectedReviewCount !== undefined) {
        // Se o contador no banco for MAIOR que o esperado, alguém já atualizou
        if (topic.review_count > expectedReviewCount) {
          throw new Error("SYNC_ERROR: A revisão já foi atualizada externamente.");
        }
        // Se o contador no banco for MENOR (impossível mas...), ignoramos.
        // Se for IGUAL, prosseguimos.
      }

      // Trava de Tempo (debounce server-side rudimentar)
      if (topic.last_reviewed_at) {
        const lastUpdate = new Date(topic.last_reviewed_at).getTime();
        const nowMs = new Date().getTime();
        // Se foi atualizado há menos de 10 segundos, bloqueia para evitar duplo clique/race condition
        if (nowMs - lastUpdate < 10000) {
          throw new Error("SYNC_ERROR: Revisão processada recentemente.");
        }
      }
      // --------------------------------------------------

      console.log('🔵 Tópico encontrado:', topic);

      // Buscar configurações do usuário (incluindo data_prova_meta)
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('review_profile, data_prova_meta')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const examDate = (settings as any)?.data_prova_meta
        ? new Date((settings as any).data_prova_meta + 'T00:00:00')
        : null;
      const { intervals, maxReviews } = REVIEW_PROFILES[profile];

      let newReviewCount = topic.review_count + 1;
      let reviewStage;
      let nextReview = null;
      let completed = false;

      console.log('🔵 Calculando próximo estágio:', {
        currentReviewCount: topic.review_count,
        newReviewCount,
        maxReviews,
        intervalsLength: intervals.length,
        intervals
      });

      // PRIMEIRO CONTATO: review_count vai de 0 para 1
      if (topic.review_count === 0) {
        reviewStage = 'Primeiro Contato';

        // Primeiro contato SEMPRE usa 24h fixo (sem ajuste de dificuldade)
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + 1); // +1 dia = 24h
        nextReview = nextReviewDate.toISOString();
        completed = false;

        console.log('🔵 Primeiro contato registrado - próxima revisão em 24h (fixo)');
      }
      // REVISÕES: review_count >= 1 (já passou do primeiro contato)
      else if (topic.review_count >= 1 && newReviewCount <= intervals.length + 1) {
        // O reviewStage indica qual revisão ESTÁ FAZENDO AGORA
        // topic.review_count=1 → fazendo revisão 24h (intervals[0]) → reviewStage = '24h'
        // topic.review_count=2 → fazendo revisão 7d (intervals[1]) → reviewStage = '7d'
        // topic.review_count=3 → fazendo revisão 15d (intervals[2]) → reviewStage = '15d'
        const currentReviewIndex = topic.review_count - 1; // Índice da revisão que está fazendo agora
        const currentInterval = intervals[currentReviewIndex];
        reviewStage = currentInterval === 1 ? '24h' : `${currentInterval}d`;

        // Agendar próxima revisão
        // newReviewCount=2 (acabou revisão 24h) → próxima é intervals[1] = 7d
        // newReviewCount=3 (acabou revisão 7d) → próxima é intervals[2] = 15d
        // newReviewCount=4 (acabou revisão 15d) → próxima é intervals[3] = 30d
        if (newReviewCount < intervals.length + 1) {
          const nextReviewIndex = newReviewCount - 1;
          const nextInterval = intervals[nextReviewIndex];

          // Usar algoritmo inteligente para calcular próxima data
          const result = calculateNextReview({
            today: new Date(),
            intervalDays: nextInterval,
            difficulty: difficulty ?? 3,
            examDate: examDate
          });

          nextReview = formatDateForDB(result.nextReviewDate);
          completed = false;

          console.log('🔵 Revisão registrada:', {
            reviewStage,
            currentInterval,
            nextInterval,
            calculationResult: describeCalculation(result),
            wasCompressed: result.wasCompressed,
            currentReviewCount: topic.review_count,
            newReviewCount
          });
        } else {
          // Última revisão - marcar como concluído mas manter o stage da revisão
          // reviewStage já foi definido acima (ex: '30d')
          nextReview = null;
          completed = true;
          console.log('🔵 Última revisão concluída:', { reviewStage, completed });
        }
      } else {
        // Todas as revisões já foram concluídas anteriormente
        reviewStage = 'Concluído';
        nextReview = null;
        completed = true;
        console.log('🔵 Todas as revisões concluídas - tópico finalizado');
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
        last_reviewed_at: now,
        // @ts-ignore - updates trigger history
        last_session_duration: durationOverride ?? difficultyModalData.duration ?? 0
      };

      // Se é a primeira revisão, definir first_studied_at
      if (topic.review_count === 0 || !topic.first_studied_at) {
        updateData.first_studied_at = now;
        console.log('🔵 Primeira revisão - definindo first_studied_at:', now);
      }

      console.log('🔵 Dados para atualização:', updateData);

      // Atualizar o tópico no banco
      const { data: updatedTopic, error: updateError } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId)
        .select('id, review_count, review_stage, next_review, completed')
        .single();

      if (updateError) throw updateError;

      console.log('✅ Tópico atualizado com sucesso:', updatedTopic);

      // Aguardar o trigger criar o registro e depois atualizar a duração
      const sessionDuration = durationOverride ?? difficultyModalData.duration ?? 0;
      if (sessionDuration > 0) {
        try {
          // Aguardar um pouco para o trigger processar
          await new Promise(resolve => setTimeout(resolve, 200));

          // Buscar o registro mais recente criado pelo trigger
          const { data: latestHistory, error: fetchError } = await supabase
            .from('topic_review_history')
            .select('id')
            .eq('topic_id', topicId)
            .order('reviewed_at', { ascending: false })
            .limit(1)
            .single();

          if (fetchError) {
            console.warn("⚠️ Erro ao buscar histórico:", fetchError);
          } else if (latestHistory) {
            // Atualizar o registro encontrado com a duração
            // @ts-ignore - coluna adicionada por migration
            const { error: updateError } = await supabase
              .from('topic_review_history')
              .update({ study_duration_minutes: sessionDuration } as any)
              .eq('id', latestHistory.id);

            if (updateError) {
              console.warn("⚠️ Erro ao atualizar duração:", updateError);
            } else {
              console.log("✅ Duração atualizada no histórico:", sessionDuration, "min");
            }
          }
        } catch (e) {
          console.warn("⚠️ Erro no fallback de histórico:", e);
        }
      }
      console.log('✅ next_review salvo no banco:', updatedTopic?.next_review);

      // Registrar sessão de estudo
      try {
        // Buscar informações da matéria
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
            undefined, // sessionStartTime
            durationOverride ?? difficultyModalData.duration // Prioritize override
          );
          console.log('✅ Sessão de estudo registrada');
        }
      } catch (sessionError) {
        console.error('⚠️ Erro ao registrar sessão de estudo:', sessionError);
        // Não falhar a operação principal por causa do tracking
      }

      // Salvar dificuldade se fornecida
      if (difficulty !== undefined) {
        await supabase
          .from('topics')
          .update({
            difficulty_level: difficulty ? String(difficulty) as any : null,
            difficulty_set_at: difficulty ? new Date().toISOString() : null
          })
          .eq('id', topicId);
      }

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

          // VERIFICAÇÃO CRÍTICA: Após atualizar a matéria, verificar se TODOS os estudos foram concluídos
          console.log('🔍 Verificando se todos os estudos foram concluídos...');

          const { data: allUserSubjects, error: subjectsError } = await supabase
            .from('subjects')
            .select(`
              id,
              name,
              status,
              topics:topics(id, completed, review_stage)
            `)
            .eq('user_id', user?.id);

          if (!subjectsError && allUserSubjects) {
            // Verificar se TODAS as matérias estão 100% concluídas
            const totalSubjects = allUserSubjects.length;
            const fullyCompletedSubjects = allUserSubjects.filter(subject => {
              if (!subject.topics || subject.topics.length === 0) return false;

              // Uma matéria está 100% concluída se TODOS os tópicos estão completed: true
              const allTopicsCompleted = subject.topics.every(topic => topic.completed === true);

              console.log(`🔍 Matéria ${subject.name}:`, {
                totalTopics: subject.topics.length,
                completedTopics: subject.topics.filter(t => t.completed).length,
                allTopicsCompleted
              });

              return allTopicsCompleted;
            });

            const areAllStudiesCompleted = fullyCompletedSubjects.length === totalSubjects && totalSubjects > 0;

            console.log('🔍 Análise final dos estudos:', {
              totalSubjects,
              fullyCompletedSubjects: fullyCompletedSubjects.length,
              areAllStudiesCompleted,
              completedSubjectNames: fullyCompletedSubjects.map(s => s.name)
            });

            if (areAllStudiesCompleted) {
              console.log('🎊 TODOS OS ESTUDOS FORAM CONCLUÍDOS!');
              console.log('🔔 DISPARANDO MENSAGEM DE ESTUDOS CONCLUÍDOS');

              // Disparar evento para mostrar mensagem de estudos concluídos
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('studiesCompleted', {
                  detail: { reason: 'allTopicsCompleted', timestamp: Date.now() }
                }));
                window.dispatchEvent(new CustomEvent('allStudiesCompleted', {
                  detail: { reason: 'allTopicsCompleted', timestamp: Date.now() }
                }));
              }, 100);

              return; // Sair aqui para não disparar evento de ciclo
            }
          }
        }
      }

      console.log('🔵 Revisão processada - atualizando dados');

      // Aguardar um pouco para garantir que o banco processou tudo
      await new Promise(resolve => setTimeout(resolve, 100));

      // Atualizar dados imediatamente para refletir mudanças
      await refreshData();

      // Disparar evento para atualizar estatísticas imediatamente com detalhes específicos
      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: {
          action: 'update',
          subjectId: topic.subject_id,
          topicId,
          source: 'topicReview'
        }
      }));

      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: {
          source: 'topicReview',
          type: 'topicReview',
          topicId,
          reviewStage,
          completed,
          timestamp: Date.now()
        }
      }));

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
    if (!difficultyModalData.topicId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('topics')
        .update({
          difficulty_level: difficulty !== null ? String(difficulty) as any : null,
          difficulty_set_at: difficulty ? new Date().toISOString() : null
        })
        .eq('id', difficultyModalData.topicId);

      if (error) {
        throw error;
      }

      if (difficulty) {
        const difficultyLabels: Record<number, string> = {
          1: 'Muito Fácil',
          2: 'Fácil',
          3: 'Médio',
          4: 'Difícil',
          5: 'Muito Difícil'
        };

        const stars = '⭐'.repeat(difficulty);
        toastManager.success(`Dificuldade: ${difficultyLabels[difficulty]} ${stars}`);
      } else {
        toastManager.info('Avaliação de dificuldade pulada');
      }

      // Atualizar dados
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
