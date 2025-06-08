
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Subject, Topic } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
}

export const useStudyPlanLogic = () => {
  const { subjects, isLoading } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [allStudiesCompleted, setAllStudiesCompleted] = useState(false);

  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const hasAvailableSubjects = subjects.length > 0;
  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  const disciplinasConcluidas = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Concluída';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // Check for all studies completed
  useEffect(() => {
    const checkAllStudiesCompleted = () => {
      if (!subjects || subjects.length === 0) {
        setAllStudiesCompleted(false);
        return;
      }

      const allCompleted = subjects.every(subject => subject.status === 'Concluída');
      setAllStudiesCompleted(allCompleted);
      
      console.log('Verificação de estudos completos:', {
        totalSubjects: subjects.length,
        completedSubjects: subjects.filter(s => s.status === 'Concluída').length,
        allCompleted
      });
    };

    checkAllStudiesCompleted();
  }, [subjects]);

  // Load user cycle
  useEffect(() => {
    const loadUserCycle = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading user cycle:', error);
          return;
        }

        setUserCycle(data);
      } catch (error) {
        console.error('Exception loading user cycle:', error);
      }
    };

    loadUserCycle();
  }, [user]);

  const dailySubjects = userCycle?.disciplinas_do_dia
    ? subjects.filter(subject => 
        userCycle.disciplinas_do_dia.includes(subject.id) && 
        subject.status !== 'Concluída'
      )
    : [];

  const nextSubjects = userCycle?.ciclo_atual
    ? subjects.filter(subject => 
        userCycle.ciclo_atual.includes(subject.id) && 
        !userCycle.disciplinas_do_dia.includes(subject.id) &&
        subject.status !== 'Concluída'
      ).slice(0, 3)
    : [];

  const allDaySubjectsCompleted = dailySubjects.length === 0 && 
    userCycle && 
    userCycle.disciplinas_do_dia.length > 0;

  const handleNextDay = useCallback(async () => {
    if (!user || !userCycle) return;

    try {
      const availableSubjects = subjects.filter(s => 
        userCycle.ciclo_atual.includes(s.id) && 
        s.status !== 'Concluída'
      );

      if (availableSubjects.length === 0) {
        setShowNewCycleMessage(true);
        return;
      }

      const nextBatch = availableSubjects.slice(0, Math.min(3, availableSubjects.length));
      const nextBatchIds = nextBatch.map(s => s.id);

      const { error } = await supabase
        .from('user_cycles')
        .update({
          disciplinas_do_dia: nextBatchIds,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setUserCycle(prev => prev ? {
        ...prev,
        disciplinas_do_dia: nextBatchIds
      } : null);

      toast.success('Novo plano diário gerado!');
    } catch (error) {
      console.error('Error generating next day:', error);
      toast.error('Erro ao gerar próximo dia');
    }
  }, [user, userCycle, subjects]);

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const markedTopics = tempMarkedTopics[subjectId] || [];
    
    if (markedTopics.length === 0) {
      toast.error('Selecione pelo menos um tópico para marcar como revisado');
      return;
    }

    try {
      const updates = markedTopics.map(topicId => {
        const topic = subjects
          .find(s => s.id === subjectId)
          ?.topics.find(t => t.id === topicId);
        
        if (!topic) return null;

        const nextStage = getNextReviewStage(topic.reviewStage || '24h');
        const nextReviewDate = getNextReviewDate(nextStage);

        return supabase
          .from('topics')
          .update({
            review_stage: nextStage,
            next_review: nextReviewDate,
            review_count: (topic.review_count || 0) + 1,
            last_reviewed_at: new Date().toISOString(),
            completed: nextStage === 'Concluído'
          })
          .eq('id', topicId);
      }).filter(Boolean);

      await Promise.all(updates);

      // Check if subject is now completed
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        const allTopicsCompleted = subject.topics.every(topic => {
          if (markedTopics.includes(topic.id)) {
            const nextStage = getNextReviewStage(topic.reviewStage || '24h');
            return nextStage === 'Concluído';
          }
          return topic.reviewStage === 'Concluído';
        });

        if (allTopicsCompleted) {
          await supabase
            .from('subjects')
            .update({ 
              status: 'Concluída',
              completed_at: new Date().toISOString()
            })
            .eq('id', subjectId);

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          toast.success(`Matéria "${subject.name}" concluída! 🎉`);
        }
      }

      // Clear temp marked topics
      setTempMarkedTopics(prev => ({
        ...prev,
        [subjectId]: []
      }));

      setExpandedSubject('');
      toast.success('Sessão concluída com sucesso!');

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Erro ao concluir sessão');
    }
  }, [tempMarkedTopics, subjects]);

  const handleToggleExpand = useCallback((subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
  }, []);

  const handleMarkTopicForReview = useCallback((subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: [...(prev[subjectId] || []), topicId]
    }));
  }, []);

  const handleCancelTopicReview = useCallback((subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).filter(id => id !== topicId)
    }));
  }, []);

  const handleHideNewCycleMessage = useCallback(() => {
    setShowNewCycleMessage(false);
  }, []);

  const getNextReviewStage = (currentStage: string): string => {
    const stages = ['24h', '7 dias', '30 dias', 'Concluído'];
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex >= 0 && currentIndex < stages.length - 1 
      ? stages[currentIndex + 1] 
      : 'Concluído';
  };

  const getNextReviewDate = (stage: string): string => {
    const now = new Date();
    switch (stage) {
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '7 dias':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30 dias':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return now.toISOString();
    }
  };

  const isTopicDominated = (topic: Topic): boolean => {
    return topic.reviewStage === 'Concluído';
  };

  return {
    isLoading,
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
    isNewCycleStarted,
    allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    isTopicDominated
  };
};
