import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle } from '@/utils/cycleUtils';
import { completeStudySession } from '@/utils/sessionUtils';
import { checkAllStudiesCompleted, isTopicDominated, syncSubjectStatus, hasStudyableSubjects } from '@/utils/studiesCompletionChecker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, ArrowRight } from 'lucide-react';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading: isAppLoading, refreshData } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [allStudiesCompleted, setAllStudiesCompleted] = useState(false);
  const [userSettings, setUserSettings] = useState<{ subjects_per_day: number } | null>(null);
  const [isCycleCompleted, setIsCycleCompleted] = useState(false);
  const [isStartingNewCycle, setIsStartingNewCycle] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Combinar os estados de loading
  const isLoading = isAppLoading || isStartingNewCycle;

  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const hasAvailableSubjects = hasStudyableSubjects(subjects);

  console.log('🔍 useStudyPlanLogic - Estado inicial:', {
    subjectsCount: subjects.length,
    hasAvailableSubjects,
    userCycle: userCycle ? {
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      ciclo_atual_length: userCycle.ciclo_atual?.length,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length
    } : null,
    subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status, topicsCount: s.topics?.length || 0 }))
  });
  
  // Contar apenas matérias do ciclo atual
  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  
  // CORRIGIR: Disciplinas concluídas devem ser as que têm status 'Concluída' no ciclo atual
  const disciplinasConcluidas = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Concluída';
  }).length || 0;

  // CORRIGIR: Disciplinas iniciadas devem ser as que têm status 'Em Estudo' no ciclo atual
  const disciplinasIniciadasCiclo = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Em Estudo';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // Load user settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user settings:', error);
          setUserSettings({ subjects_per_day: 3 });
        } else {
          setUserSettings(data);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        setUserSettings({ subjects_per_day: 3 });
      }
    };

    fetchUserSettings();
  }, [user]);

  // Inicializar ciclo apenas uma vez
  useEffect(() => {
    const initializeCycle = async () => {
      if (!user || !subjects.length || !userSettings) {
        setIsInitialized(true);
        return;
      }

      try {
        const existingCycle = await loadUserCycle(user.id);
        
        if (!existingCycle || !existingCycle.id) {
          console.log('📝 Criando novo ciclo...');
          
          const availableSubjects = subjects.filter(s => 
            s.status !== 'Concluída' && s.topics && s.topics.length > 0
          );
          
          if (availableSubjects.length === 0) {
            console.log('⚠️ Nenhuma matéria disponível para o ciclo');
            setUserCycle({
              id: '',
              user_id: user.id,
              ciclo_atual: [],
              disciplinas_do_dia: [],
              ciclos_realizados: 0,
              data_inicio_ciclo: new Date().toISOString(),
              data_fim_ciclo: null,
              atualizado_em: new Date().toISOString(),
              created_at: new Date().toISOString()
            });
            setIsInitialized(true);
            return;
          }

          const cycleSubjectIds = availableSubjects.map(s => s.id);
          const subjectsPerDay = userSettings.subjects_per_day || 3;
          const firstDaySubjects = cycleSubjectIds.slice(0, subjectsPerDay);

          const { error } = await supabase
            .from('user_cycles')
            .insert({
              user_id: user.id,
              ciclo_atual: cycleSubjectIds,
              disciplinas_do_dia: firstDaySubjects,
              data_inicio_ciclo: new Date().toISOString(),
              atualizado_em: new Date().toISOString()
            });

          if (error) {
            console.error('Erro ao criar ciclo:', error);
            setIsInitialized(true);
            return;
          }

          const newCycle = await loadUserCycle(user.id);
          setUserCycle(newCycle);
        } else {
          console.log('📋 Ciclo existente carregado:', existingCycle);
          setUserCycle(existingCycle);
        }
      } catch (error) {
        console.error('Erro ao inicializar ciclo:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeCycle();
  }, [user, subjects, userSettings]);

  // Sincronização periódica dos status das matérias
  useEffect(() => {
    if (subjects.length > 0 && userCycle) {
      syncSubjectStatus(subjects);
    }
  }, [subjects, userCycle]);

  // Verificação de estudos completos
  useEffect(() => {
    if (subjects.length > 0 && userCycle) {
      const hasStudyable = hasStudyableSubjects(subjects);
      
      if (!hasStudyable) {
        setAllStudiesCompleted(false);
        return;
      }
      
      const allCompleted = checkAllStudiesCompleted(subjects);
      
      if (allCompleted !== allStudiesCompleted) {
        setAllStudiesCompleted(allCompleted);
        
        if (allCompleted) {
          setTimeout(() => refreshData(), 1000);
        }
      }
    }
  }, [subjects, userCycle, allStudiesCompleted, refreshData]);

  // Filtrar corretamente as matérias diárias
  const dailySubjects = userCycle?.disciplinas_do_dia && userCycle.disciplinas_do_dia.length > 0
    ? subjects.filter(subject => {
        const isInDailyList = userCycle.disciplinas_do_dia.includes(subject.id);
        const isNotCompleted = subject.status !== 'Concluída';
        const hasTopics = subject.topics && subject.topics.length > 0;
        
        return isInDailyList && isNotCompleted && hasTopics;
      })
      // Manter a ordem original das matérias do dia
      .sort((a, b) => {
        const indexA = userCycle.disciplinas_do_dia.indexOf(a.id);
        const indexB = userCycle.disciplinas_do_dia.indexOf(b.id);
        return indexA - indexB;
      })
    : [];

  // Filtrar próximas matérias (apenas as que não estão concluídas, não estão no dia e estão no ciclo)
  const nextSubjects = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0
    ? subjects.filter(subject => {
        const isInCycle = userCycle.ciclo_atual.includes(subject.id);
        const isNotInDaily = !userCycle.disciplinas_do_dia.includes(subject.id);
        const isNotCompleted = subject.status !== 'Concluída';
        const hasTopics = subject.topics && subject.topics.length > 0;
        
        return isInCycle && isNotInDaily && isNotCompleted && hasTopics;
      })
      // Manter a ordem do ciclo e limitar pela configuração
      .sort((a, b) => {
        const indexA = userCycle.ciclo_atual.indexOf(a.id);
        const indexB = userCycle.ciclo_atual.indexOf(b.id);
        return indexA - indexB;
      })
      .slice(0, userSettings?.subjects_per_day || 3)
    : [];

  // Verificar se todas as matérias do dia foram concluídas e ainda existem matérias para o próximo dia
  const allDaySubjectsCompleted = userCycle && 
    userCycle.disciplinas_do_dia.length === 0 && // Não há matérias no dia atual
    userCycle.ciclo_atual.length > 0 && // Ainda existem matérias no ciclo
    !allStudiesCompleted && // Não concluiu todos os estudos
    !isCycleCompleted && // O ciclo não está concluído
    nextSubjects.length > 0; // Existem matérias disponíveis para o próximo dia

  console.log('🔍 Verificação allDaySubjectsCompleted:', {
    hasCycle: Boolean(userCycle),
    disciplinasDoDiaLength: userCycle?.disciplinas_do_dia.length,
    cicloAtualLength: userCycle?.ciclo_atual.length,
    allStudiesCompleted,
    isCycleCompleted,
    nextSubjectsLength: nextSubjects.length,
    shouldShowMessage: allDaySubjectsCompleted
  });

  console.log('🎯 useStudyPlanLogic - Estado final:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    subjectsLength: subjects.length,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
    dailySubjects: dailySubjects.map(s => s.name),
    nextSubjects: nextSubjects.map(s => s.name)
  });

  const handleNextDay = async () => {
    if (!user || !userCycle || isCycleCompleted) return;

    try {
      const result = await generateNextDay(user.id, userCycle, subjects);
      
      if (result.shouldShowNewCycleMessage) {
        setShowNewCycleMessage(true);
        setIsCycleCompleted(true);
      } else {
        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
      }
    } catch (error) {
      console.error('Erro ao gerar próximo dia:', error);
      toast.error('Erro ao carregar próximas matérias');
    }
  };

  const handleCompleteSession = async (subjectId: string) => {
    if (!user || !userCycle) return;

    try {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        toast.error('Matéria não encontrada');
        return;
      }

      await completeStudySession(
        user.id,
        subjectId,
        subject.name,
        tempMarkedTopics[subjectId] || [],
        subject.status || 'Em Estudo'
      );
      
      setTempMarkedTopics(prev => ({ ...prev, [subjectId]: [] }));
      setExpandedSubject('');
      
      const updatedCycle = await loadUserCycle(user.id);
      setUserCycle(updatedCycle);
      
      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
  };

  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: [...(prev[subjectId] || []), topicId]
    }));
  };

  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).filter(id => id !== topicId)
    }));
  };

  const handleHideNewCycleMessage = () => {
    setShowNewCycleMessage(false);
  };

  // Verificar estado do ciclo quando o userCycle mudar
  useEffect(() => {
    if (!userCycle) return;

    const cycleCompleted = userCycle.ciclo_atual.length === 0 && Boolean(userCycle.data_fim_ciclo);
    setIsCycleCompleted(cycleCompleted);
  }, [userCycle]);

  // Adicionar função para iniciar novo ciclo
  const handleStartNewCycle = async () => {
    if (!user) return;

    setIsStartingNewCycle(true);
    try {
      // Limpar ciclo atual
      await supabase
        .from('user_cycles')
        .delete()
        .eq('user_id', user.id);

      // Resetar status das matérias
      await supabase
        .from('subjects')
        .update({ status: 'Nova' })
        .eq('user_id', user.id);

      // Recarregar dados
      await refreshData();
      
      // Recarregar ciclo
      const newCycle = await loadUserCycle(user.id);
      setUserCycle(newCycle);
      setIsCycleCompleted(false);
      setShowNewCycleMessage(false);
      
      toast.success('Novo ciclo iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar novo ciclo:', error);
      toast.error('Erro ao iniciar novo ciclo');
    } finally {
      setIsStartingNewCycle(false);
    }
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
    disciplinasIniciadasCiclo,
    isCycleCompleted,
    handleStartNewCycle
  };
};
