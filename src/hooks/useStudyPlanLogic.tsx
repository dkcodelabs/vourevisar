
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { useCycleManagement } from './useCycleManagement';
import { useSubjectFiltering } from './useSubjectFiltering';
import { useStudySession } from './useStudySession';
import { useTopicActions } from './useTopicActions';

export const useStudyPlanLogic = () => {
  const { user } = useAuth();
  const { subjects, refreshData, userSettings } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  // Usar os hooks compostos
  const {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    isStartingNewCycle,
    isCycleLoading,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    handleStartNewCycle,
    handleHideNewCycleMessage
  } = useCycleManagement(subjects, userSettings);

  const {
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    allStudiesCompleted,
    allTopicsInReview
  } = useSubjectFiltering(subjects, userCycle, userSettings);

  const {
    expandedSubject,
    setExpandedSubject,
    isNextDayLoading,
    handleNextDay: baseHandleNextDay,
    handleCompleteSession: baseHandleCompleteSession,
    handleToggleExpand
  } = useStudySession();

  const {
    tempMarkedTopics,
    setTempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview
  } = useTopicActions();

  // Wrapper function that provides the required parameters to the base handleNextDay
  const handleNextDay = () => {
    if (!userCycle) return;
    return baseHandleNextDay(userCycle, setUserCycle, setShowNewCycleMessage, () => {});
  };

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
      const { intervals } = REVIEW_PROFILES[profile];

      let newReviewCount = topic.review_count + 1;
      let reviewStage;
      let nextReview = null;
      let completed = false;

      // Calcular próximo estágio de revisão
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

      await refreshData();
      toast.success('Revisão registrada com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao marcar tópico como revisado:', error);
      toast.error('Erro ao registrar revisão');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSession = (subjectId: string) => {
    return baseHandleCompleteSession(
      subjectId,
      userCycle!,
      tempMarkedTopics,
      setUserCycle,
      setTempMarkedTopics
    );
  };

  return {
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    disciplinasIniciadasCiclo,
    isCycleCompleted,
    handleStartNewCycle,
    isNextDayLoading,
    showNewCycleStarted,
    allTopicsInReview,
    isCycleLoading,
    markTopicAsReviewed,
    isLoading
  };
};
