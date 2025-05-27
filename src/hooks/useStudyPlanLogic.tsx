
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCycleState } from '@/hooks/useCycleState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { addDays } from 'date-fns';
import { Topic, RevisionStage } from '@/types';

export const useStudyPlanLogic = () => {
  const { subjects, userProfile, fetchSubjects, fetchUserSettings } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const isFirstRender = useRef(true);
  
  const { userCycle, isLoading: isCycleLoading, fetchUserCycle, updateUserCycle, createInitialUserCycle, isAllDaySubjectsCompleted } = useCycleState();
  
  const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
  
  const currentSubjects = subjects.filter(subject => 
    subject.status === 'Em Estudo' || subject.status === 'Nova'
  ).sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const dailySubjects = subjects.filter(
    s => userCycle?.disciplinas_do_dia.includes(s.id)
  );

  const materiasPendentes = subjects
    .filter(subject => 
      (subject.status === 'Em Estudo' || subject.status === 'Nova') && 
      !userCycle?.ciclo_atual.includes(subject.id) &&
      !userCycle?.disciplinas_do_dia.includes(subject.id)
    )
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const nextSubjects = materiasPendentes.slice(0, subjectsPerDay);
  const allDaySubjectsCompleted = isAllDaySubjectsCompleted();
  const totalDisciplinasCiclo = currentSubjects.length;
  const disciplinasConcluidas = userCycle?.ciclo_atual.length || 0;
  const isNewCycleStarted = disciplinasConcluidas === 0 && totalDisciplinasCiclo > 0 && userCycle?.ciclos_realizados > 0;

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        if (subjects.length === 0) {
          await fetchSubjects();
        }
        if (!userProfile?.settings) {
          await fetchUserSettings();
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Create initial cycle if needed
  useEffect(() => {
    if (!isCycleLoading && !userCycle && currentSubjects.length > 0 && subjectsPerDay) {
      createInitialUserCycle(subjectsPerDay, currentSubjects);
    }
  }, [isCycleLoading, userCycle, currentSubjects.length, subjectsPerDay]);

  // Update daily subjects when settings change
  useEffect(() => {
    if (userProfile?.settings?.subjectsPerDay && userCycle && currentSubjects.length > 0) {
      const newSubjectsPerDay = userProfile.settings.subjectsPerDay;
      
      if (userCycle.disciplinas_do_dia.length === 0 || userCycle.disciplinas_do_dia.length !== newSubjectsPerDay) {
        const availableSubjects = currentSubjects.filter(s => !userCycle.ciclo_atual.includes(s.id));
        const newDisciplinasDoDia = availableSubjects.slice(0, newSubjectsPerDay).map(s => s.id);
        
        updateUserCycle({
          disciplinas_do_dia: newDisciplinasDoDia
        });
      }
    }
  }, [userProfile?.settings?.subjectsPerDay, currentSubjects.length, userCycle?.disciplinas_do_dia?.length, userCycle?.ciclo_atual?.length]);

  // Helper functions
  const calculateNextReview = (stage: RevisionStage | undefined): Date => {
    const now = new Date();
    
    switch(stage) {
      case '24h':
        return addDays(now, 1);
      case '7dias':
        return addDays(now, 7);
      case '30dias':
        return addDays(now, 30);
      default:
        return addDays(now, 1);
    }
  };

  const getNextReviewStage = (currentStage: RevisionStage | undefined): RevisionStage => {
    switch(currentStage) {
      case '24h':
        return '7dias';
      case '7dias':
        return '30dias';
      case '30dias':
        return 'Concluído';
      default:
        return '24h';
    }
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Event handlers
  const handleNextDay = async () => {
    if (materiasPendentes.length === 0) {
      toast.info("Não há mais matérias disponíveis para estudar.");
      return;
    }

    const novasDisciplinas = materiasPendentes.slice(0, subjectsPerDay).map(s => s.id);
    
    await updateUserCycle({
      disciplinas_do_dia: novasDisciplinas
    });
    
    setExpandedSubject(null);
    toast.info("Novas matérias carregadas para estudo!");
  };

  const handleCompleteSession = async (subjectId: string) => {
    const topicsToUpdate = tempMarkedTopics[subjectId] || [];
    try {
      for (const topicId of topicsToUpdate) {
        const topic = subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
        if (!topic) continue;
        const nextStage = getNextReviewStage(topic.reviewStage);
        let updateData: any = {
          review_count: topic.reviewCount + 1,
          last_reviewed_at: new Date().toISOString()
        };
        if (nextStage === 'Concluído') {
          updateData.completed = true;
          updateData.next_review = null;
          updateData.review_stage = 'Concluído';
        } else {
          updateData.next_review = calculateNextReview(nextStage).toISOString();
          updateData.review_stage = nextStage;
        }
        await supabase.from('topics').update(updateData).eq('id', topicId);
        
        console.log('Dispatching topicReviewed event for topic:', topicId);
        window.dispatchEvent(new CustomEvent('topicReviewed', { 
          detail: { topicId } 
        }));
      }
      
      await fetchSubjects();
      
      const newCicloAtual = [...(userCycle?.ciclo_atual || []), subjectId];
      const newDisciplinasDoDia = userCycle?.disciplinas_do_dia.filter(id => id !== subjectId) || [];
      
      setExpandedSubject(null);
      setTempMarkedTopics(prev => {
        const updated = { ...prev };
        delete updated[subjectId];
        return updated;
      });
      
      await updateUserCycle({
        ciclo_atual: newCicloAtual,
        disciplinas_do_dia: newDisciplinasDoDia
      });
      
      const todasMateriasDoDiaConcluidas = newDisciplinasDoDia.length === 0;
      
      if (todasMateriasDoDiaConcluidas) {
        launchConfetti();
        
        const todasMatConcluidas = currentSubjects.every(subject => newCicloAtual.includes(subject.id));
        
        if (todasMatConcluidas) {
          setTimeout(async () => {
            setCurrentSubjectIndex(0);
            setExpandedSubject(null);
            
            await updateUserCycle({
              ciclo_atual: [],
              disciplinas_do_dia: [],
              ciclos_realizados: (userCycle?.ciclos_realizados || 0) + 1,
              data_inicio_ciclo: new Date().toISOString(),
              data_fim_ciclo: new Date().toISOString()
            });
            
            await fetchUserCycle();
          }, 3000);
          return;
        }
        
        toast.success("Parabéns! Você concluiu todas as matérias do dia!");
      } else {
        toast.success("Matéria concluída!");
      }

      await fetchUserCycle();
    } catch (error) {
      toast.error("Erro ao salvar revisões. Tente novamente.");
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
    }
    if (expandedSubject !== subjectId) {
      toast.info("Estudo iniciado");
    }
  };

  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const updated = { ...prev };
      if (!updated[subjectId]) updated[subjectId] = [];
      if (!updated[subjectId].includes(topicId)) {
        updated[subjectId] = [...updated[subjectId], topicId];
      }
      return updated;
    });
  };

  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const updated = { ...prev };
      if (updated[subjectId]) {
        updated[subjectId] = updated[subjectId].filter(id => id !== topicId);
      }
      return updated;
    });
  };

  // Cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      setTempMarkedTopics({});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setTempMarkedTopics({});
    };
  }, []);

  useEffect(() => {
    if (expandedSubject && !tempMarkedTopics[expandedSubject]) {
      setTempMarkedTopics(prev => ({ ...prev, [expandedSubject]: [] }));
    }
  }, [expandedSubject]);

  return {
    // State
    isLoading: isLoading || isCycleLoading,
    expandedSubject,
    tempMarkedTopics,
    
    // Data
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    isNewCycleStarted,
    
    // Handlers
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview
  };
};
