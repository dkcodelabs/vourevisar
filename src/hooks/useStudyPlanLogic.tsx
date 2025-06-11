import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle } from '@/utils/cycleUtils';
import { completeStudySession } from '@/utils/sessionUtils';
import { checkAllStudiesCompleted, isTopicDominated, syncSubjectStatus, hasStudyableSubjects } from '@/utils/studiesCompletionChecker';
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
  const hasAvailableSubjects = hasStudyableSubjects(subjects); // CORRIGIDO: Usar nova função
  
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

  // Debug log dos subjects carregados
  useEffect(() => {
    console.log('📚 useStudyPlanLogic - Subjects loaded:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status })),
      isLoading,
      userCycle: userCycle ? {
        ciclo_atual: userCycle.ciclo_atual,
        disciplinas_do_dia: userCycle.disciplinas_do_dia
      } : null
    });
  }, [subjects, isLoading, userCycle]);

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

  // CORRIGIDO: Verificação melhorada de estudos completos
  useEffect(() => {
    if (subjects.length > 0) {
      console.log('🔍 Verificando estudos completos...');
      
      // Verificar se realmente há matérias disponíveis para estudo
      const hasStudyable = hasStudyableSubjects(subjects);
      
      if (!hasStudyable) {
        console.log('🎯 Nenhuma matéria disponível para estudo');
        setAllStudiesCompleted(false);
        return;
      }
      
      const allCompleted = checkAllStudiesCompleted(subjects);
      console.log('🎯 Resultado da verificação:', { allCompleted, hasStudyable });
      
      // Só considerar completo se TODAS as matérias estão realmente concluídas
      if (allCompleted !== allStudiesCompleted) {
        console.log('🎯 Mudando estado allStudiesCompleted:', allCompleted);
        setAllStudiesCompleted(allCompleted);
        
        if (allCompleted) {
          console.log('🎯 Todos os estudos completos - fazendo refresh dos dados');
          setTimeout(() => refreshData(), 1000);
        }
      }
    } else {
      console.log('🎯 Nenhuma matéria encontrada');
      setAllStudiesCompleted(false);
    }
  }, [subjects, refreshData, allStudiesCompleted]); // CORRIGIDO: Adicionar allStudiesCompleted nas dependências

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

  // CORRIGIDO: Filtrar corretamente as matérias diárias
  const dailySubjects = userCycle?.disciplinas_do_dia
    ? subjects.filter(subject => {
        const isInDailyList = userCycle.disciplinas_do_dia.includes(subject.id);
        const isNotCompleted = subject.status !== 'Concluída';
        const hasTopics = subject.topics && subject.topics.length > 0;
        
        console.log(`📋 Matéria "${subject.name}":`, {
          isInDailyList,
          isNotCompleted,
          hasTopics,
          status: subject.status,
          includeInDaily: isInDailyList && isNotCompleted && hasTopics
        });
        
        return isInDailyList && isNotCompleted && hasTopics;
      })
    : [];

  // Filtrar próximas matérias (apenas as que não estão concluídas, não estão no dia e estão no ciclo)
  const nextSubjects = userCycle?.ciclo_atual
    ? subjects.filter(subject => 
        userCycle.ciclo_atual.includes(subject.id) && 
        !userCycle.disciplinas_do_dia.includes(subject.id) &&
        subject.status !== 'Concluída'
      ).slice(0, userSettings?.subjects_per_day || 3)
    : [];

  const allDaySubjectsCompleted = userCycle && 
    userCycle.disciplinas_do_dia.length === 0 && 
    !allStudiesCompleted;

  console.log('🎯 useStudyPlanLogic - Estado atual:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    subjectsLength: subjects.length,
    dailySubjectsLength: dailySubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
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
        
        console.log('🔄 Ciclo atualizado após sessão:', {
          before: userCycle?.disciplinas_do_dia,
          after: updatedCycle?.disciplinas_do_dia
        });
      }

      toast.success('Sessão concluída com sucesso!');

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir sessão');
    }
  }, [tempMarkedTopics, subjects, refreshData, user, userCycle]);

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
    disciplinasIniciadasCiclo,
    isTopicDominated
  };
};
