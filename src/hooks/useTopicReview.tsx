
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { useStudySessionTracking } from './useStudySessionTracking';

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
  }>({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectId: '',
    subjectName: '',
    currentDifficulty: null
  });

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
        
        // Se excedeu o número máximo de revisões, marcar como concluído
        completed = (newReviewCount > maxReviews);
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
            topic.name
          );
          console.log('✅ Sessão de estudo registrada');
        }
      } catch (sessionError) {
        console.error('⚠️ Erro ao registrar sessão de estudo:', sessionError);
        // Não falhar a operação principal por causa do tracking
      }

      // VERIFICAÇÃO CRÍTICA: Modal aparece apenas na PRIMEIRA revisão E se não tem dificuldade
      const isFirstReview = topic.review_count === 1; // Primeira revisão = review_count atual é 1 (antes de incrementar)
      const hasNoDifficulty = !topic.difficulty_level;
      const shouldShowModal = isFirstReview && hasNoDifficulty;
      
      console.log('🔍 VERIFICANDO MODAL DE DIFICULDADE:', {
        topicId,
        topicName: topic.name,
        review_count_atual: topic.review_count,
        newReviewCount,
        isFirstReview: `${isFirstReview} (review_count atual é 1)`,
        difficulty_level: topic.difficulty_level,
        hasNoDifficulty,
        shouldShowModal
      });

      if (shouldShowModal) {
        console.log('🌟 CONDIÇÃO ATENDIDA - Primeira revisão sem dificuldade, mostrando modal:', {
          topicId,
          topicName: topic.name,
          isFirstReview,
          completed,
          difficulty_level: topic.difficulty_level
        });
        
        // Buscar informações da matéria para o modal
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', topic.subject_id)
          .single();

        if (subjectError) {
          console.error('❌ Erro ao buscar dados da matéria:', subjectError);
        }

        if (subjectData) {
          console.log('🌟 ABRINDO MODAL DE DIFICULDADE:', {
            topicId,
            topicName: topic.name,
            subjectName: subjectData.name,
            modalState: 'SETTING TO OPEN'
          });
          
          setDifficultyModalData({
            isOpen: true,
            topicId: topicId,
            topicName: topic.name,
            subjectId: topic.subject_id,
            subjectName: subjectData.name
          });

          console.log('🌟 MODAL STATE UPDATED - Verificar se modal aparece na tela');
        } else {
          console.error('❌ Dados da matéria não encontrados para o modal');
        }
      } else {
        console.log('🔍 MODAL NÃO SERÁ EXIBIDO:', {
          topicId,
          completed,
          review_count_atual: topic.review_count,
          isFirstReview: `${isFirstReview} (precisa ser true)`,
          difficulty_level: topic.difficulty_level,
          hasNoDifficulty,
          reason: !isFirstReview ? `não é primeira revisão (review_count=${topic.review_count}, precisa ser 1)` : 'já tem dificuldade definida'
        });
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

      // Não chamar refreshData aqui se usado dentro de uma sessão
      // O refresh será feito pelo componente que gerencia a sessão
      console.log('🔵 Revisão processada - disparando evento de atualização');
      
      // Disparar evento para atualizar estatísticas imediatamente com detalhes específicos
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
      currentDifficulty
    });
  };

  const closeDifficultyModal = () => {
    setDifficultyModalData({
      isOpen: false,
      topicId: '',
      topicName: '',
      subjectId: '',
      subjectName: '',
      currentDifficulty: null
    });
  };

  const submitDifficultyRating = async (difficulty: number | null) => {
    if (!difficultyModalData.topicId) return;

    try {
      const { error } = await supabase
        .from('topics')
        .update({
          difficulty_level: difficulty,
          difficulty_set_at: difficulty ? new Date().toISOString() : null
        })
        .eq('id', difficultyModalData.topicId);

      if (error) throw error;

      if (difficulty) {
        const difficultyLabels = {
          1: 'Muito Fácil',
          2: 'Fácil', 
          3: 'Médio',
          4: 'Difícil',
          5: 'Muito Difícil'
        };
        
        const stars = '⭐'.repeat(difficulty);
        toastManager.success(`Dificuldade: ${difficultyLabels[difficulty as keyof typeof difficultyLabels]} ${stars}`);
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
    isLoading,
    difficultyModalData,
    openDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating
  };
};
