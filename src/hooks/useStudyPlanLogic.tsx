
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle } from '@/utils/cycleUtils';
import { completeStudySession } from '@/utils/sessionUtils';
import { checkAllStudiesCompleted, isTopicDominated, syncSubjectStatus } from '@/utils/studiesCompletionChecker';
import { supabase } from '@/integrations/supabase/client';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading, refreshData } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [allStudiesCompleted, setAllStudiesCompleted] = useState(false);
  const [userSettings, setUserSettings] = useState<{ subjects_per_day: number } | null>(null);

  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const hasAvailableSubjects = subjects.length > 0;
  
  // Contar apenas matérias do ciclo atual
  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  const disciplinasConcluidas = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Concluída';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // Debug log dos subjects carregados
  useEffect(() => {
    console.log('📚 useStudyPlanLogic - Subjects loaded:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status })),
      isLoading
    });
  }, [subjects, isLoading]);

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
          setUserSettings({ subjects_per_day: 3 }); // default
        } else {
          setUserSettings(data);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        setUserSettings({ subjects_per_day: 3 }); // default
      }
    };

    fetchUserSettings();
  }, [user]);

  // Sincronização periódica dos status das matérias
  useEffect(() => {
    if (subjects.length > 0) {
      syncSubjectStatus(subjects);
    }
  }, [subjects]);

  // Check for all studies completed - lógica melhorada e persistente
  useEffect(() => {
    if (subjects.length > 0) {
      const allCompleted = checkAllStudiesCompleted(subjects);
      console.log('🎯 useStudyPlanLogic - Setting allStudiesCompleted:', allCompleted);
      setAllStudiesCompleted(allCompleted);
      
      // Se todos os estudos estão completos, refresh dos dados para garantir consistência
      if (allCompleted) {
        console.log('🎯 Todos os estudos completos - fazendo refresh dos dados');
        setTimeout(() => refreshData(), 1000);
      }
    } else {
      console.log('🎯 useStudyPlanLogic - No subjects found, setting allStudiesCompleted to false');
      setAllStudiesCompleted(false);
    }
  }, [subjects, refreshData]);

  // Debug log when allStudiesCompleted changes
  useEffect(() => {
    console.log('🎯 useStudyPlanLogic - allStudiesCompleted state changed:', allStudiesCompleted);
  }, [allStudiesCompleted]);

  // Load user cycle
  useEffect(() => {
    const loadCycle = async () => {
      if (!user) return;

      try {
        const data = await loadUserCycle(user.id);
        console.log('🔄 useStudyPlanLogic - User cycle loaded:', data);
        setUserCycle(data);
      } catch (error) {
        console.error('Exception loading user cycle:', error);
      }
    };

    loadCycle();
  }, [user]);

  // Filtrar apenas matérias que não estão concluídas para a lista diária
  const dailySubjects = userCycle?.disciplinas_do_dia
    ? subjects.filter(subject => 
        userCycle.disciplinas_do_dia.includes(subject.id) && 
        subject.status !== 'Concluída'
      )
    : [];

  // Filtrar próximas matérias (apenas as que não estão concluídas e não estão no dia)
  const nextSubjects = userCycle?.ciclo_atual
    ? subjects.filter(subject => 
        userCycle.ciclo_atual.includes(subject.id) && 
        !userCycle.disciplinas_do_dia.includes(subject.id) &&
        subject.status !== 'Concluída'
      ).slice(0, userSettings?.subjects_per_day || 3)
    : [];

  // Detectar quando o dia está completo (todas as matérias do dia foram removidas)
  const allDaySubjectsCompleted = userCycle && 
    userCycle.disciplinas_do_dia.length === 0 && 
    !allStudiesCompleted;

  console.log('🎯 useStudyPlanLogic - Render state:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    subjectsLength: subjects.length,
    dailySubjectsLength: dailySubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    userSettings,
    userCycleInfo: userCycle ? {
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      ciclo_atual: userCycle.ciclo_atual
    } : null
  });

  const handleNextDay = useCallback(async () => {
    if (!user || !userCycle) return;

    try {
      const result = await generateNextDay(user.id, userCycle, subjects);
      
      if (result.shouldShowNewCycleMessage) {
        setShowNewCycleMessage(true);
        return;
      }

      setUserCycle(prev => prev ? {
        ...prev,
        disciplinas_do_dia: result.newDisciplinasoDia
      } : null);

      toast.success('Novo plano diário gerado!');
    } catch (error) {
      console.error('Error generating next day:', error);
      toast.error('Erro ao gerar próximo dia');
    }
  }, [user, userCycle, subjects]);

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const markedTopics = tempMarkedTopics[subjectId] || [];
    
    try {
      const result = await completeStudySession(subjectId, markedTopics, subjects);
      
      if (result.subjectCompleted) {
        toast.success(`Matéria "${result.subjectName}" concluída! 🎉`);
      }

      // Clear temp marked topics
      setTempMarkedTopics(prev => ({
        ...prev,
        [subjectId]: []
      }));

      setExpandedSubject('');
      
      // Refresh dados imediatamente para atualizar a interface
      await refreshData();
      
      // Recarregar o ciclo do usuário para refletir as mudanças
      if (user) {
        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
      }

      toast.success('Sessão concluída com sucesso!');

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir sessão');
    }
  }, [tempMarkedTopics, subjects, refreshData, user]);

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
