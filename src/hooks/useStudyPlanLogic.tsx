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
import { Button } from '@/components/ui/button';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading: isAppLoading, refreshData, updateTopic, setSubjects } = useApp();
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
  const [isAdding, setIsAdding] = useState(false);
  const [isNextDayLoading, setIsNextDayLoading] = useState(false);
  const [isCycleLoading, setIsCycleLoading] = useState(true);
  const [showNewCycleStarted, setShowNewCycleStarted] = useState(false);

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

  // Load user settings with immediate fallback
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;

      // Set default immediately to avoid blocking cycle initialization
      setUserSettings({ subjects_per_day: 3 });

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setUserSettings(data);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        // Keep the default value already set
      }
    };

    fetchUserSettings();
  }, [user]);

  // Inicializar ciclo apenas uma vez
  useEffect(() => {
    const initializeCycle = async () => {
      setIsCycleLoading(true);
      if (!user || !subjects.length || !userSettings) {
        setIsInitialized(true);
        setIsCycleLoading(false);
        return;
      }

      try {
        const existingCycle = await loadUserCycle(user.id);
        const availableSubjects = subjects.filter(s => s.status !== 'Concluída');
        const subjectsPerDay = userSettings.subjects_per_day || 3;

        // Se não existe ciclo, criar um novo
        if (!existingCycle || !existingCycle.id) {
          if (availableSubjects.length > 0) {
            console.log('📝 Criando novo ciclo...');
            const cycleSubjectIds = availableSubjects.map(s => s.id);
            
            const { error } = await supabase
              .from('user_cycles')
              .insert({
                user_id: user.id,
                ciclo_atual: cycleSubjectIds,
                disciplinas_do_dia: cycleSubjectIds.slice(0, subjectsPerDay),
                data_inicio_ciclo: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
              });

            if (error) {
              console.error('Erro ao criar ciclo:', error);
              setIsInitialized(true);
              setIsCycleLoading(false);
              return;
            }

            const newCycle = await loadUserCycle(user.id);
            setUserCycle(newCycle);
          } else {
            setUserCycle(null);
          }
        } else {
          // Ciclo existente - verificar se há novas matérias para adicionar
          const currentCycleSubjects = existingCycle.ciclo_atual || [];
          const newSubjects = availableSubjects.filter(s => !currentCycleSubjects.includes(s.id));
          
          if (newSubjects.length > 0) {
            console.log('📝 Adicionando novas matérias ao ciclo atual (só aparecerão no próximo ciclo)...');
            // Adicionar novas matérias APENAS ao ciclo_atual, NÃO às disciplinas_do_dia
            const updatedCycleSubjects = [...currentCycleSubjects, ...newSubjects.map(s => s.id)];
            
            const { error } = await supabase
              .from('user_cycles')
              .update({
                ciclo_atual: updatedCycleSubjects,
                atualizado_em: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (error) {
              console.error('Erro ao atualizar ciclo:', error);
            }
          }
          
          // Recarregar ciclo atualizado
          const updatedCycle = await loadUserCycle(user.id);
          setUserCycle(updatedCycle);
        }
      } catch (error) {
        console.error('Erro ao inicializar ciclo:', error);
      } finally {
        setIsInitialized(true);
        setIsCycleLoading(false);
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

  // Filtrar matérias diárias - aparecem enquanto houver tópicos não marcados para revisão
  const dailySubjects = userCycle?.disciplinas_do_dia && userCycle.disciplinas_do_dia.length > 0
    ? subjects.filter(subject => {
        const isInDailyList = userCycle.disciplinas_do_dia.includes(subject.id);
        const isNotCompleted = subject.status !== 'Concluída';
        const hasTopics = subject.topics && subject.topics.length > 0;
        
        // Matéria aparece para estudo enquanto houver tópicos não marcados para revisão
        const hasUnreviewedTopics = subject.topics && subject.topics.some(t => t.review_count === 0);
        
        return isInDailyList && isNotCompleted && hasTopics && hasUnreviewedTopics;
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
    ? userCycle.ciclo_atual
        .filter(id => {
          // Só as que não estão no dia e não estão concluídas
          const subject = subjects.find(s => s.id === id);
          if (!subject || userCycle.disciplinas_do_dia.includes(id) || subject.status === 'Concluída' || !subject.topics || subject.topics.length === 0) {
            return false;
          }
          
          // Filtrar apenas matérias que ainda têm tópicos não revisados
          const hasUnreviewedTopics = subject.topics.some(t => t.review_count === 0);
          return hasUnreviewedTopics;
        })
        .slice(0, userSettings?.subjects_per_day || 3)
        .map(id => subjects.find(s => s.id === id))
        .filter(Boolean)
    : [];

  // Verificar se há tópicos em revisão e não há mais tópicos para estudar hoje
  const allTopicsInReview = subjects.length > 0 && 
    subjects.some(s => s.topics && s.topics.some(t => t.review_count > 0)) &&
    dailySubjects.length === 0 && 
    nextSubjects.length === 0 &&
    userCycle && userCycle.ciclo_atual.length > 0;

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
    allTopicsInReview,
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
    nextSubjects: nextSubjects.map(s => s.name),
    topicsInReview: subjects.map(s => ({
      name: s.name,
      topics: s.topics.map(t => ({ name: t.name, review_count: t.review_count }))
    }))
  });

  const handleNextDay = async () => {
    if (!user || !userCycle || isCycleCompleted) return;

    console.log('➡️ Antes de gerar próximo dia:', {
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      ciclo_atual: userCycle.ciclo_atual
    });

    setIsNextDayLoading(true);
    try {
      const result = await generateNextDay(user.id, userCycle, subjects);
      // Sempre recarregar ciclo e matérias após atualizar o dia
      const updatedCycle = await loadUserCycle(user.id);
      console.log('⬅️ Depois de gerar próximo dia:', {
        disciplinas_do_dia: updatedCycle.disciplinas_do_dia,
        ciclo_atual: updatedCycle.ciclo_atual
      });
      setUserCycle(updatedCycle);
      await refreshData();
      // Só mostrar mensagem de ciclo completo se, após recarregar, não houver matérias
      const hasMatériasParaHoje = updatedCycle.disciplinas_do_dia && updatedCycle.disciplinas_do_dia.length > 0;
      if (result.shouldShowNewCycleMessage && !hasMatériasParaHoje) {
        setShowNewCycleMessage(true);
        setIsCycleCompleted(true);
      }
    } catch (error) {
      console.error('Erro ao gerar próximo dia:', error);
      toast.error('Erro ao carregar próximas matérias');
    } finally {
      setIsNextDayLoading(false);
    }
  };

  // Marcação/desmarcação local de tópicos para revisão
  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const novo = {
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), topicId]
      };
      console.log('🟢 handleMarkTopicForReview', { subjectId, topicId, tempMarkedTopics: novo });
      return novo;
    });
  };

  // Cancelar marcação local
  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const novo = {
        ...prev,
        [subjectId]: (prev[subjectId] || []).filter(id => id !== topicId)
      };
      console.log('🔴 handleCancelTopicReview', { subjectId, topicId, tempMarkedTopics: novo });
      return novo;
    });
  };

  // Concluir sessão: salvar de fato no banco todos os tópicos marcados
  const handleCompleteSession = async (subjectId: string) => {
    if (!user || !userCycle) return;

    try {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        toast.error('Matéria não encontrada');
        return;
      }

      const topicsToReview = tempMarkedTopics[subjectId] || [];

      if (topicsToReview.length > 0) {
        // Buscar perfil de revisão do usuário
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('review_profile')
          .eq('user_id', user.id)
          .single();
        if (settingsError) throw settingsError;
        const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
        const { intervals } = REVIEW_PROFILES[profile];
        const firstInterval = intervals[0];
        const reviewStage = firstInterval === 1 ? '24h' : `${firstInterval}d`;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + firstInterval);

        // Marcar todos os tópicos selecionados para revisão
        for (const topicId of topicsToReview) {
          await updateTopic(subjectId, topicId, {
            reviewCount: 1,
            reviewStage,
            nextReview,
            completed: false
          });
        }
      }

      setTempMarkedTopics(prev => ({ ...prev, [subjectId]: [] }));
      setExpandedSubject('');

      // Remover a matéria do ciclo_atual e disciplinas_do_dia no banco
      const updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
      const updatedDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      // Atualizar o ciclo no banco
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: updatedCicloAtual,
          disciplinas_do_dia: updatedDisciplinasDoDia,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Erro ao atualizar ciclo:', updateError);
        throw updateError;
      }

      // Buscar novamente o ciclo atualizado do banco
      const freshCycle = await loadUserCycle(user.id);
      if (!freshCycle) {
        throw new Error('Erro ao carregar ciclo atualizado');
      }
      setUserCycle(freshCycle);

      // Recarregar dados globais para refletir avanço dos tópicos
      await refreshData();

      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
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
      
      // Exibir mensagem de novo ciclo iniciado
      setShowNewCycleStarted(true);
      setTimeout(() => setShowNewCycleStarted(false), 5000);
      
      toast.success('Novo ciclo iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar novo ciclo:', error);
      toast.error('Erro ao iniciar novo ciclo');
    } finally {
      setIsStartingNewCycle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Implementar novamente a funcionalidade
    toast.success("Funcionalidade temporariamente desabilitada");
    setIsAdding(false);
  };

  const markTopicAsReviewed = async (topicId: string) => {
    try {
      const { data: topic } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (!topic) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('review_profile')
        .eq('user_id', user.id)
        .single();

      const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const { intervals, maxReviews } = REVIEW_PROFILES[profile];

      let newReviewCount = topic.review_count + 1;
      let reviewStage;
      let nextReview = null;
      let completed = false;

      if (newReviewCount <= intervals.length) {
        // Ainda há revisões a fazer
        const nextInterval = intervals[newReviewCount - 1];
        reviewStage = nextInterval === 1 ? '24h' : `${nextInterval}d`;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
        nextReview = nextReviewDate.toISOString();
      } else {
        // Todas as revisões feitas
        reviewStage = 'Concluído';
        nextReview = null;
        completed = true;
      }

      const { error } = await supabase
        .from('topics')
        .update({
          review_count: newReviewCount,
          next_review: nextReview,
          review_stage: reviewStage,
          completed
        })
        .eq('id', topicId);

      if (error) throw error;

      // Atualizar estado local
      setSubjects(prev => 
        prev.map(subject => ({
          ...subject,
          topics: subject.topics.map(t => 
            t.id === topicId 
              ? {
                  ...t,
                  review_count: newReviewCount,
                  next_review: nextReview,
                  review_stage: reviewStage,
                  completed
                }
              : t
          )
        }))
      );

      // --- NOVO: Atualizar status da matéria se todos os tópicos estiverem concluídos ---
      // Encontrar a matéria do tópico
      const subject = subjects.find(s => s.topics.some(t => t.id === topicId));
      if (subject) {
        // Buscar tópicos atualizados da matéria
        const { data: updatedTopics } = await supabase
          .from('topics')
          .select('id, completed')
          .eq('subject_id', subject.id);
        if (updatedTopics && updatedTopics.length > 0) {
          const allCompleted = updatedTopics.every(t => t.completed);
          if (allCompleted && subject.status !== 'Concluída') {
            // Atualizar status da matéria no banco
            await supabase
              .from('subjects')
              .update({ status: 'Concluída' })
              .eq('id', subject.id);
            // Atualizar estado local
            setSubjects(prev =>
              prev.map(s =>
                s.id === subject.id ? { ...s, status: 'Concluída' } : s
              )
            );
          }
        }
      }
      // --- FIM NOVO ---

      await refreshData();
      toast.success('Revisão registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao marcar tópico como revisado:', error);
      toast.error('Erro ao registrar revisão');
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
    handleStartNewCycle,
    isAdding,
    handleSubmit,
    isNextDayLoading,
    isCycleLoading,
    showNewCycleStarted,
    markTopicAsReviewed,
    allTopicsInReview
  };
};
