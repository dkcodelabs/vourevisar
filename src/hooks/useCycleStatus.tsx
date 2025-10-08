import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';
import { updateStudiedSubjects, addStudiedSubject, resetCycle, isSubjectStudiedGlobal } from '@/utils/cycleState';

export const useCycleStatus = () => {
  const { user } = useAuth();
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados do ciclo
  const loadCycle = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Log removido para evitar spam
      
      // Atualizar estado global
      if (data?.materias_estudadas_ciclo) {
        updateStudiedSubjects(data.materias_estudadas_ciclo);
      }
      
      setUserCycle(data);
    } catch (error) {
      console.error('Erro ao carregar ciclo:', error);
    }
  }, [user]);

  // Marcar matéria como estudada no ciclo atual
  const markSubjectAsStudied = useCallback(async (subjectId: string, subjectName: string) => {
    if (!user || !userCycle) return false;

    setIsLoading(true);
    try {
      // SEMPRE buscar estado atual do banco para evitar dados desatualizados
      const { data: freshCycle, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (cycleError || !freshCycle) {
        console.error('❌ Erro ao buscar ciclo atual:', cycleError);
        return false;
      }
      
      const currentStudied = freshCycle.materias_estudadas_ciclo || [];
      
      // Se já está estudada, não fazer nada
      if (currentStudied.includes(subjectId)) {
        toast.info(`${subjectName} já foi estudada neste ciclo`);
        return true;
      }

      const newStudied = [...currentStudied, subjectId];
      
      // Verificar se esta é a última matéria ativa do ciclo (ignorar concluídas)
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id);
      
      if (!allSubjects) throw new Error('Erro ao carregar matérias');
      
      // Separar matérias ativas das 100% concluídas
      const activeSubjectsInCurrentCycle: string[] = [];
      const completedSubjectsInCurrentCycle: string[] = [];
      
      freshCycle.ciclo_atual.forEach(id => {
        const subject = allSubjects.find(s => s.id === id);
        if (!subject) return;
        
        // Verificar se está 100% concluída (TODOS os tópicos devem estar concluídos)
        if (subject.topics && subject.topics.length > 0) {
          const allTopicsCompleted = subject.topics.every(topic =>
            topic.reviewStage === 'Concluído' || topic.completed === true
          );
          
          if (allTopicsCompleted) {
            completedSubjectsInCurrentCycle.push(id);
            return;
          }
        }
        
        activeSubjectsInCurrentCycle.push(id);
      });
      
      // Verificar quantas matérias ativas ainda não foram estudadas (APÓS incluir a atual)
      const unstudiedActiveSubjects = activeSubjectsInCurrentCycle.filter(id => {
        return !newStudied.includes(id);
      });
      
      // Verificar se esta é a última matéria ativa (APÓS incluir a atual)
      const isLastActiveSubject = unstudiedActiveSubjects.length === 0;
      
      console.log('🎯 Debug detalhado da última matéria:', {
        subjectName,
        currentSubjectId: subjectId,
        activeSubjectsInCurrentCycle,
        newStudied,
        unstudiedActiveSubjects,
        isLastActiveSubject,
        shouldStartNewCycle: isLastActiveSubject
      });
      
      // Obter nomes das matérias para debug
      const unstudiedSubjectNames = unstudiedActiveSubjects.map(id => {
        const subject = allSubjects.find(s => s.id === id);
        return subject ? subject.name : id;
      });
      
      const studiedSubjectNames = newStudied.map(id => {
        const subject = allSubjects.find(s => s.id === id);
        return subject ? subject.name : id;
      });
      
      console.log('🔍 Verificação de fim de ciclo:', {
        subjectName,
        totalInCycle: freshCycle.ciclo_atual.length,
        activeSubjectsInCurrentCycle: activeSubjectsInCurrentCycle.length,
        completedSubjectsInCurrentCycle: completedSubjectsInCurrentCycle.length,
        unstudiedActiveSubjects: unstudiedActiveSubjects.length,
        unstudiedSubjectNames,
        isLastActiveSubject,
        newStudied: newStudied.length,
        studiedSubjectNames,
        activeSubjectNames: activeSubjectsInCurrentCycle.map(id => {
          const subject = allSubjects.find(s => s.id === id);
          return subject ? subject.name : id;
        })
      });

      // Log para debug (a verificação de fim de ciclo agora é feita no componente)
      console.log('📚 Matéria marcada como estudada:', {
        subjectName,
        remaining: unstudiedActiveSubjects.length,
        remainingNames: unstudiedSubjectNames
      });
      
      // Log removido para otimização
      
      let updateData: any;

      if (isLastActiveSubject) {
        // É a última matéria - iniciar novo ciclo
        updateData = {
          materias_estudadas_ciclo: [],
          ciclos_realizados: (freshCycle.ciclos_realizados || 0) + 1,
          data_inicio_ciclo: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        console.log('🎉 Iniciando novo ciclo:', {
          cicloAtual: freshCycle.ciclos_realizados,
          novoCiclo: updateData.ciclos_realizados,
          calculo: `${freshCycle.ciclos_realizados || 0} + 1 = ${updateData.ciclos_realizados}`
        });
        
        // Atualizar estado global
        resetCycle(updateData.ciclos_realizados);
      } else {
        // Não é a última - apenas adicionar à lista de estudadas
        updateData = {
          materias_estudadas_ciclo: newStudied,
          atualizado_em: new Date().toISOString()
        };
        
        console.log('📝 Atualizando lista de estudadas:', {
          antes: currentStudied,
          depois: newStudied,
          adicionada: subjectName
        });
        
        // Atualizar estado global
        addStudiedSubject(subjectId);
      }

      // SEMPRE limpar matérias 100% concluídas do ciclo
      const currentCycle = freshCycle.ciclo_atual || [];
      const cleanedCycle = currentCycle.filter((id: string) => {
        const subject = allSubjects.find(s => s.id === id);
        if (!subject) return false;
        
        // Remover matérias 100% concluídas do ciclo
        if (subject.topics && subject.topics.length > 0) {
          const completedTopics = subject.topics.filter(topic =>
            topic.reviewStage === 'Concluído' || topic.completed === true
          ).length;
          
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          if (progress >= 100) {
            console.log(`🗑️ Removendo matéria 100% concluída do ciclo: ${subject.name}`);
            return false;
          }
        }
        
        return true;
      });
      
      // Sempre atualizar o ciclo limpo
      updateData.ciclo_atual = cleanedCycle;
      
      // IMPORTANTE: Filtrar IDs estudados para manter apenas os que ainda estão no ciclo limpo
      if (updateData.materias_estudadas_ciclo && cleanedCycle.length !== currentCycle.length) {
        const filteredStudiedIds = updateData.materias_estudadas_ciclo.filter((id: string) => 
          cleanedCycle.includes(id)
        );
        updateData.materias_estudadas_ciclo = filteredStudiedIds;
        
        console.log('🔧 Filtrando IDs estudados após limpeza do ciclo:', {
          antes: newStudied,
          depois: filteredStudiedIds,
          removidos: newStudied.filter((id: string) => !filteredStudiedIds.includes(id))
        });
      }
      
      console.log('🔄 Limpeza do ciclo:', {
        cicloOriginal: currentCycle.length,
        cicloLimpo: cleanedCycle.length,
        removidas: currentCycle.length - cleanedCycle.length
      });

      const { error } = await supabase
        .from('user_cycles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Forçar atualização do estado local IMEDIATAMENTE
      const { data: updatedCycle } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (updatedCycle) {
        setUserCycle(updatedCycle);
        console.log('🔄 Estado local atualizado:', updatedCycle);
        
        // Se foi iniciado um novo ciclo, mostrar notificação
        if (isLastActiveSubject) {
          // Verificar se ainda há matérias ativas para estudar
          const hasActiveSubjects = activeSubjectsInCurrentCycle.length > 0;
          
          if (hasActiveSubjects) {
            console.log('🔔 DISPARANDO MENSAGEM DE NOVO CICLO');
            toast.success(`🎉 Parabéns! Ciclo #${updatedCycle.ciclos_realizados} iniciado!`);
            
            // Modal removida - apenas toast
          } else {
            // Todas as matérias foram concluídas - NÃO disparar evento de novo ciclo
            console.log('🎊 Todos os estudos foram concluídos!');
            console.log('🔔 DISPARANDO MENSAGEM DE ESTUDOS CONCLUÍDOS');
            toast.success('🎊 Parabéns! Você concluiu todos os estudos!');
            
            // Disparar evento especial (sem modal)
            window.dispatchEvent(new CustomEvent('allStudiesCompleted'));
          }
        }
      }
      
      // Forçar atualização de todos os componentes com pequeno delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cycleUpdated'));
      }, 100);
      
      // Dados recarregados
      
      return true;
    } catch (error) {
      console.error('Erro ao marcar matéria como estudada:', error);
      toast.error('Erro ao marcar matéria como estudada');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, userCycle, loadCycle]);

  // Verificar se uma matéria foi estudada no ciclo atual (usando estado global)
  const isSubjectStudied = useCallback((subjectId: string): boolean => {
    // Usar estado global para resposta imediata
    const globalResult = isSubjectStudiedGlobal(subjectId);
    
    // Fallback para dados do banco se estado global não tiver
    const dbResult = userCycle?.materias_estudadas_ciclo?.includes(subjectId) || false;
    
    const result = globalResult || dbResult;
    
    // Log removido para evitar spam
    
    return result;
  }, [userCycle]);

  // Obter próxima matéria sugerida (primeira não estudada e não concluída)
  const getNextSuggestedSubject = useCallback((subjects: any[] = []): string | null => {
    try {
      if (!userCycle?.ciclo_atual) return null;
      
      const studied = userCycle.materias_estudadas_ciclo || [];
      
      // Encontrar a primeira matéria que:
      // 1. Não foi estudada no ciclo atual
      // 2. Não está 100% concluída
      return userCycle.ciclo_atual.find(id => {
        if (studied.includes(id)) return false; // Já estudada no ciclo
        
        // Verificar se a matéria está 100% concluída
        const subject = subjects.find(s => s.id === id);
        if (!subject) return true; // Se não encontrar, considerar válida
        
        // Calcular se está 100% concluída
        if (subject.topics.length === 0) return true; // Sem tópicos, pode estudar
        
        const completedTopics = subject.topics.filter(topic =>
          topic.reviewStage === 'Concluído'
        ).length;
        
        const progress = Math.round((completedTopics / subject.topics.length) * 100);
        return progress < 100; // Só sugerir se não estiver 100% concluída
      }) || null;
    } catch (error) {
      console.error('Erro ao obter próxima matéria:', error);
      return null;
    }
  }, [userCycle]);

  // Verificar se uma matéria específica é a próxima sugerida
  const isNextSuggested = useCallback((subjectId: string, subject?: any): boolean => {
    try {
      if (!userCycle?.ciclo_atual) return false;
      
      const studied = userCycle.materias_estudadas_ciclo || [];
      
      // Se já foi estudada, não é a próxima
      if (studied.includes(subjectId)) return false;
      
      // Se está 100% concluída, não é a próxima (verificação defensiva)
      if (subject && subject.topics && Array.isArray(subject.topics) && subject.topics.length > 0) {
        try {
          const completedTopics = subject.topics.filter(topic =>
            topic && topic.reviewStage === 'Concluído'
          ).length;
          
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          if (progress >= 100) return false;
        } catch (topicError) {
          console.warn('Erro ao verificar tópicos da matéria:', topicError);
          // Se houver erro, continuar sem verificar progresso
        }
      }
      
      // Verificar se é a primeira matéria não estudada no ciclo
      const nextId = userCycle.ciclo_atual.find(id => !studied.includes(id));
      return nextId === subjectId;
    } catch (error) {
      console.error('Erro ao verificar se é próxima sugerida:', error);
      return false;
    }
  }, [userCycle]);

  // Obter estatísticas corretas do ciclo atual
  const getCycleStats = useCallback(async () => {
    if (!user) return null;
    
    console.log('🔄 getCycleStats: Buscando estatísticas atualizadas...');
    
    try {
      // Buscar dados frescos do ciclo atual
      const { data: freshUserCycle, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (cycleError || !freshUserCycle) {
        console.error('Erro ao buscar ciclo atual:', cycleError);
        return null;
      }
      // Buscar todas as matérias do usuário para calcular as 100% concluídas
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          status,
          topics:topics(id, review_stage, completed)
        `)
        .eq('user_id', user.id);
      
      if (subjectsError || !allSubjects) {
        console.error('Erro ao buscar matérias:', subjectsError);
        return null;
      }
      
      // Contar matérias 100% concluídas (que têm todos os tópicos com review_stage = 'Concluído' OU completed = true)
      const completedSubjects = allSubjects.filter(subject => {
        if (!subject.topics || subject.topics.length === 0) return false;
        
        const completedTopics = subject.topics.filter(topic => 
          topic.review_stage === 'Concluído' || topic.completed === true
        ).length;
        
        const isCompleted = completedTopics === subject.topics.length;
        
        // Log detalhado para debug (removido para evitar spam)
        
        return isCompleted;
      });
      
      // LIMPAR matérias 100% concluídas do ciclo_atual
      const completedSubjectIds = completedSubjects.map(s => s.id);
      const currentCycle = freshUserCycle.ciclo_atual || [];
      const cleanedCycle = currentCycle.filter(id => !completedSubjectIds.includes(id));
      
      console.log('🧹 Limpeza do ciclo:', {
        completedSubjects: completedSubjects.map(s => ({ id: s.id, name: s.name })),
        currentCycle: currentCycle.length,
        cleanedCycle: cleanedCycle.length,
        removedSubjects: currentCycle.length - cleanedCycle.length
      });
      
      // Se o ciclo foi limpo, atualizar no banco
      if (cleanedCycle.length !== currentCycle.length) {
        // Atualizar status das matérias concluídas para "Concluída"
        for (const completedSubject of completedSubjects) {
          if (completedSubject.status !== 'Concluída') {
            await supabase
              .from('subjects')
              .update({ status: 'Concluída' })
              .eq('id', completedSubject.id)
              .eq('user_id', user.id);
          }
        }
        
        await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: cleanedCycle,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        // Atualizar o userCycle local
        setUserCycle(prev => prev ? { ...prev, ciclo_atual: cleanedCycle } : null);
        
        // Usar o ciclo limpo para os cálculos
        freshUserCycle.ciclo_atual = cleanedCycle;
      }
      
      const totalSubjects = cleanedCycle.length;
      
      // Contar apenas matérias estudadas que AINDA ESTÃO no ciclo limpo
      const studiedInCurrentCycle = (freshUserCycle.materias_estudadas_ciclo || []).filter(studiedId => 
        cleanedCycle.includes(studiedId)
      );
      
      const studiedSubjects = studiedInCurrentCycle.length;
      const remainingSubjects = Math.max(0, totalSubjects - studiedSubjects);
      
      const stats = {
        totalSubjects,
        totalActiveSubjects: totalSubjects,
        totalCompletedSubjects: completedSubjects.length, // Agora conta corretamente
        studiedSubjects,
        remainingSubjects,
        activeSubjects: totalSubjects,
        cycleNumber: freshUserCycle.ciclos_realizados || 0,
        cycleStartDate: freshUserCycle.data_inicio_ciclo,
        studiedSubjectIds: freshUserCycle.materias_estudadas_ciclo || [],
        studiedActiveSubjectIds: studiedInCurrentCycle,
        allSubjectIds: cleanedCycle,
        activeSubjectIds: cleanedCycle,
        completedSubjectIds: completedSubjects.map(s => s.id)
      };
      
      console.log('📊 getCycleStats: Estatísticas calculadas:', stats);
      
      // Limpeza forçada removida para evitar loops infinitos
      // A limpeza já é feita na lógica principal acima
      
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas do ciclo:', error);
      return null;
    }
  }, [user]);

  // Carregar dados quando o componente monta
  useEffect(() => {
    loadCycle();
    
    // Listener removido para evitar loops
  }, [user]); // Manter apenas user como dependência

  return {
    userCycle,
    isLoading,
    loadCycle,
    markSubjectAsStudied,
    isSubjectStudied,
    getCycleStats,
    getNextSuggestedSubject,
    isNextSuggested
  };
};