
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCycleState } from '@/hooks/useCycleState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { addDays, isAfter, startOfDay } from 'date-fns';
import { Topic, RevisionStage, Subject } from '@/types';

export const useStudyPlanLogic = () => {
  const { subjects, userProfile, fetchSubjects, fetchUserSettings, updateSubject } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [lastCheckedDate, setLastCheckedDate] = useState<Date>(new Date());
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [lastCycleCount, setLastCycleCount] = useState<number>(0);
  const isFirstRender = useRef(true);
  
  const { userCycle, isLoading: isCycleLoading, fetchUserCycle, updateUserCycle, createInitialUserCycle, isAllDaySubjectsCompleted } = useCycleState();
  
  const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
  
  // Função para verificar se uma matéria está completamente concluída
  const isSubjectCompleted = (subject: Subject): boolean => {
    if (subject.topics.length === 0) return false;
    return subject.topics.every(topic => 
      topic.completed && topic.reviewStage === 'Concluído'
    );
  };

  // Filtrar matérias para excluir as completamente concluídas
  const currentSubjects = subjects
    .filter(subject => 
      (subject.status === 'Em Estudo' || subject.status === 'Nova') && 
      !isSubjectCompleted(subject)
    )
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const dailySubjects = currentSubjects.filter(subject =>
    userCycle?.disciplinas_do_dia.includes(subject.id)
  );

  const materiasPendentes = subjects
    .filter(subject => 
      (subject.status === 'Em Estudo' || subject.status === 'Nova') && 
      !userCycle?.ciclo_atual.includes(subject.id) &&
      !userCycle?.disciplinas_do_dia.includes(subject.id) &&
      !isSubjectCompleted(subject)
    )
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const nextSubjects = materiasPendentes.slice(0, subjectsPerDay);
  const allDaySubjectsCompleted = userCycle?.disciplinas_do_dia.length === 0;
  const totalDisciplinasCiclo = currentSubjects.length;
  const disciplinasConcluidas = userCycle?.ciclo_atual.length || 0;
  const isNewCycleStarted = disciplinasConcluidas === 0 && totalDisciplinasCiclo > 0 && userCycle?.ciclos_realizados > 0;

  const disciplinasIniciadas = currentSubjects.filter(subject =>
    subject.topics.some(topic => topic.reviewStage && topic.reviewStage !== "Não Iniciado")
  ).length;

  const disciplinasNaoIniciadas = currentSubjects.filter(subject =>
    subject.topics.every(topic => !topic.reviewStage || topic.reviewStage === "Não Iniciado")
  ).length;

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

  // Check for new cycle completion and control message display
  useEffect(() => {
    if (!userCycle) return;

    const currentCycleKey = `cycle_${userCycle.ciclos_realizados}_shown`;
    const wasMessageShown = sessionStorage.getItem(currentCycleKey);

    console.log('Verificando novo ciclo:', {
      ciclos_realizados: userCycle.ciclos_realizados,
      lastCycleCount,
      wasMessageShown,
      currentCycleKey
    });

    // Se é um novo ciclo e a mensagem ainda não foi mostrada nesta sessão
    if (userCycle.ciclos_realizados > lastCycleCount && !wasMessageShown) {
      console.log('Novo ciclo detectado, mostrando mensagem');
      setShowNewCycleMessage(true);
      sessionStorage.setItem(currentCycleKey, 'true');
      
      // Esconder a mensagem após 5 segundos
      setTimeout(() => {
        setShowNewCycleMessage(false);
      }, 5000);
    }
    
    setLastCycleCount(userCycle.ciclos_realizados);
  }, [userCycle?.ciclos_realizados, lastCycleCount]);

  // Check for day change - only load if day was previously completed
  useEffect(() => {
    const checkDayChange = () => {
      const today = startOfDay(new Date());
      const lastChecked = startOfDay(lastCheckedDate);
      
      if (isAfter(today, lastChecked)) {
        console.log('Dia mudou, verificando condições para auto-load');
        setLastCheckedDate(new Date());
        
        // Só carregar automaticamente se:
        // 1. Todas as disciplinas do dia anterior foram concluídas
        // 2. Há matérias pendentes para carregar
        // 3. O usuário não tem disciplinas do dia atual
        const shouldAutoLoad = allDaySubjectsCompleted && 
                               materiasPendentes.length > 0 && 
                               (!userCycle?.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0);
        
        if (shouldAutoLoad) {
          console.log('Carregando disciplinas automaticamente devido à mudança de dia');
          const novasDisciplinas = materiasPendentes.slice(0, subjectsPerDay).map(s => s.id);
          updateUserCycle({
            disciplinas_do_dia: novasDisciplinas
          });
          toast.info("Novo dia! Novas matérias carregadas para estudo!");
        }
      }
    };

    const interval = setInterval(checkDayChange, 60000);
    return () => clearInterval(interval);
  }, [allDaySubjectsCompleted, userCycle, materiasPendentes.length, subjectsPerDay, lastCheckedDate]);

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

  // Função para verificar e atualizar status da matéria automaticamente
  const checkAndUpdateSubjectStatus = async (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    if (isSubjectCompleted(subject) && subject.status !== 'Concluída') {
      await updateSubject(subjectId, { status: 'Concluída' });
      toast.success(`Matéria "${subject.name}" foi marcada como concluída! 🎉`);
    }
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

    await fetchUserCycle();
    await fetchSubjects(); // Garante atualização imediata das disciplinas

    setExpandedSubject(null);
    toast.info("Novas matérias carregadas para estudo!");
  };

  const handleCompleteSession = async (subjectId: string) => {
    const topicsToUpdate = tempMarkedTopics[subjectId] || [];
    console.log('Iniciando conclusão de sessão para:', subjectId);
    
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
      
      // Verificar e atualizar status da matéria após atualizar os dados
      await checkAndUpdateSubjectStatus(subjectId);
      
      const newCicloAtual = [...(userCycle?.ciclo_atual || []), subjectId];
      const newDisciplinasDoDia = userCycle?.disciplinas_do_dia.filter(id => id !== subjectId) || [];
      
      console.log('Atualizando ciclo:', {
        newCicloAtual,
        newDisciplinasDoDia,
        currentCycle: userCycle?.ciclo_atual,
        currentDaySubjects: userCycle?.disciplinas_do_dia
      });
      
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
      console.log('Todas as matérias do dia concluídas:', todasMateriasDoDiaConcluidas);
      
      if (todasMateriasDoDiaConcluidas) {
        launchConfetti();
        console.log('Lançando confetes - disciplinas do dia concluídas');
        
        const todasMatConcluidas = currentSubjects.every(subject => newCicloAtual.includes(subject.id));
        console.log('Todas as matérias do ciclo concluídas:', todasMatConcluidas);
        
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

  const handleHideNewCycleMessage = () => {
    setShowNewCycleMessage(false);
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

  // Debug logs
  console.log('StudyPlan Logic Debug:', {
    allDaySubjectsCompleted,
    dailySubjectsLength: dailySubjects.length,
    disciplinas_do_dia: userCycle?.disciplinas_do_dia,
    ciclo_atual: userCycle?.ciclo_atual,
    showNewCycleMessage,
    completedSubjectsFiltered: subjects.filter(isSubjectCompleted).length
  });

  return {
    // State
    isLoading: isLoading || isCycleLoading,
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    
    // Data
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    isNewCycleStarted,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    
    // Handlers
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    
    // Helper function (export for use in other components)
    isSubjectCompleted
  };
};
