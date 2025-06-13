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

  // Inicializar ciclo apenas uma vez quando necessário
  useEffect(() => {
    const initializeCycle = async () => {
      // Evitar loops: só inicializar se temos usuário, matérias e configurações, mas ainda não temos ciclo
      if (!user || !subjects.length || !userSettings || userCycle) return;

      console.log('🚀 Inicializando ciclo para usuário:', user.id);
      
      try {
        // Verificar se já existe um ciclo
        const existingCycle = await loadUserCycle(user.id);
        
        if (!existingCycle) {
          console.log('📝 Criando novo ciclo...');
          
          // Criar novo ciclo com todas as matérias disponíveis
          const availableSubjects = subjects.filter(s => 
            s.status !== 'Concluída' && s.topics && s.topics.length > 0
          );
          
          if (availableSubjects.length === 0) {
            console.log('⚠️ Nenhuma matéria disponível para o ciclo');
            // Definir um ciclo vazio em vez de retornar undefined
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
            return;
          }

          const cycleSubjectIds = availableSubjects.map(s => s.id);
          const subjectsPerDay = userSettings.subjects_per_day || 3;
          const firstDaySubjects = cycleSubjectIds.slice(0, subjectsPerDay);

          console.log('📋 Novo ciclo:', {
            totalSubjects: cycleSubjectIds.length,
            firstDaySubjects: firstDaySubjects.length,
            subjectsPerDay
          });

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
            return;
          }

          // Recarregar o ciclo criado
          const newCycle = await loadUserCycle(user.id);
          setUserCycle(newCycle);
          
          console.log('✅ Ciclo criado com sucesso:', newCycle);
        } else {
          console.log('📋 Ciclo existente carregado:', existingCycle);
          setUserCycle(existingCycle);
        }
      } catch (error) {
        console.error('Erro ao inicializar ciclo:', error);
      }
    };

    initializeCycle();
  }, [user, subjects.length, userSettings?.subjects_per_day]); // Remover userCycle das dependências

  // Sincronização periódica dos status das matérias
  useEffect(() => {
    if (subjects.length > 0) {
      syncSubjectStatus(subjects);
    }
  }, [subjects]);

  // Verificação de estudos completos
  useEffect(() => {
    if (subjects.length > 0) {
      console.log('🔍 Verificando estudos completos...');
      
      const hasStudyable = hasStudyableSubjects(subjects);
      
      if (!hasStudyable) {
        console.log('🎯 Nenhuma matéria disponível para estudo');
        setAllStudiesCompleted(false);
        return;
      }
      
      const allCompleted = checkAllStudiesCompleted(subjects);
      console.log('🎯 Resultado da verificação:', { allCompleted, hasStudyable });
      
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
  }, [subjects, refreshData, allStudiesCompleted]);

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
    if (isCycleCompleted) {
      console.log('⚠️ Ciclo atual concluído, necessário iniciar novo ciclo');
      return;
    }
    if (!user || !userCycle) {
      console.log('❌ handleNextDay: user ou userCycle não disponível');
      return;
    }

    // Verificar se há matérias disponíveis antes de tentar gerar próximo dia
    if (subjects.length === 0) {
      console.log('❌ Nenhuma matéria disponível para gerar próximo dia');
      toast.error('Adicione matérias para continuar estudando');
      return;
    }

    console.log('🚀 handleNextDay executado');

    try {
      const result = await generateNextDay(user.id, userCycle, subjects);
      
      if (result.shouldShowNewCycleMessage) {
        setShowNewCycleMessage(true);
        return;
      }

      // Recarregar o ciclo completo do banco
      const updatedCycle = await loadUserCycle(user.id);
      setUserCycle(updatedCycle);

      console.log('✅ Próximo dia gerado:', {
        newDisciplinasoDia: result.newDisciplinasoDia,
        updatedCycle
      });

      toast.success('Novo plano diário gerado!');
    } catch (error) {
      console.error('Error generating next day:', error);
      toast.error('Erro ao gerar próximo dia');
    }
  };

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }

    const markedTopics = tempMarkedTopics[subjectId] || [];
    const subject = subjects.find(s => s.id === subjectId);
    
    if (!subject) {
      toast.error('Matéria não encontrada');
      return;
    }
    
    try {
      // Atualizar estado local primeiro para uma transição suave
      setExpandedSubject('');
      setTempMarkedTopics(prev => ({
        ...prev,
        [subjectId]: []
      }));

      // Atualizar no banco de dados em paralelo
      const result = await completeStudySession(
        user.id,
        subjectId,
        subject.name,
        markedTopics,
        subject.status || 'Em Estudo'
      );
      
      // Atualizar dados em paralelo
      await Promise.all([
        (async () => {
          const updatedCycle = await loadUserCycle(user.id);
          setUserCycle(updatedCycle);
        })(),
        refreshData()
      ]);
      
      if (result.subjectCompleted) {
        toast.success(`Matéria "${result.subjectName}" concluída! 🎉`);
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

  // Verificar estado do ciclo quando o userCycle mudar
  useEffect(() => {
    if (!userCycle) return;

    const cycleCompleted = userCycle.ciclo_atual.length === 0 && Boolean(userCycle.data_fim_ciclo);
    setIsCycleCompleted(cycleCompleted);
  }, [userCycle]);

  // Adicionar função para iniciar novo ciclo
  const handleStartNewCycle = async () => {
    if (!user) return;

    try {
      // Iniciar loading e limpar estados
      setIsStartingNewCycle(true);
      setUserCycle(null); // Limpar o ciclo atual para evitar flash do estado anterior
      setIsCycleCompleted(false);
      setShowNewCycleMessage(false);

      // Filtrar apenas matérias não concluídas
      const availableSubjects = subjects.filter(s => 
        s.status !== 'Concluída' && s.topics && s.topics.length > 0
      );

      if (availableSubjects.length === 0) {
        toast.error('Não há matérias disponíveis para um novo ciclo');
        return;
      }

      const cycleSubjectIds = availableSubjects.map(s => s.id);
      const subjectsPerDay = userSettings?.subjects_per_day || 3;
      const firstDaySubjects = cycleSubjectIds.slice(0, subjectsPerDay);

      // Atualizar o ciclo no banco de dados
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: cycleSubjectIds,
          disciplinas_do_dia: firstDaySubjects,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar os dados em paralelo e aguardar ambos terminarem
      await Promise.all([
        (async () => {
          const updatedCycle = await loadUserCycle(user.id);
          setUserCycle(updatedCycle);
        })(),
        refreshData()
      ]);
      
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
    isTopicDominated,
    isCycleCompleted,
    handleStartNewCycle
  };
};
