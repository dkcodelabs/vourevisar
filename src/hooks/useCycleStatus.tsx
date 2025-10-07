import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';

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
      const currentStudied = userCycle.materias_estudadas_ciclo || [];
      
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
      
      userCycle.ciclo_atual.forEach(id => {
        const subject = allSubjects.find(s => s.id === id);
        if (!subject) return;
        
        // Verificar se está 100% concluída
        if (subject.topics && subject.topics.length > 0) {
          const completedTopics = subject.topics.filter(topic =>
            topic.reviewStage === 'Concluído'
          ).length;
          
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          if (progress >= 100) {
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
      
      // Se não há matérias ativas ou todas as ativas foram estudadas, reiniciar ciclo
      const isLastActiveSubject = activeSubjectsInCurrentCycle.length === 0 || unstudiedActiveSubjects.length === 0;
      
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
        activeSubjectsInCurrentCycle: activeSubjectsInCurrentCycle.length,
        unstudiedActiveSubjects: unstudiedActiveSubjects.length,
        unstudiedSubjectNames,
        isLastActiveSubject,
        newStudied: newStudied.length,
        studiedSubjectNames
      });

      // Log para debug (a verificação de fim de ciclo agora é feita no componente)
      console.log('📚 Matéria marcada como estudada:', {
        subjectName,
        remaining: unstudiedActiveSubjects.length,
        remainingNames: unstudiedSubjectNames
      });
      
      // Log removido para otimização
      
      let updateData: any = {
        materias_estudadas_ciclo: isLastActiveSubject ? [] : newStudied, // Reset se for a última ativa
        atualizado_em: new Date().toISOString()
      };

      // A lógica de novo ciclo agora é feita no componente após verificação completa

      // Antes de atualizar, verificar se há matérias 100% concluídas que devem ser removidas do ciclo
      const currentCycle = updateData.ciclo_atual || userCycle.ciclo_atual;
      const cleanedCycle = currentCycle.filter((id: string) => {
        const subject = allSubjects.find(s => s.id === id);
        if (!subject) return false;
        
        // Remover matérias 100% concluídas do ciclo
        if (subject.topics && subject.topics.length > 0) {
          const completedTopics = subject.topics.filter(topic =>
            topic.reviewStage === 'Concluído'
          ).length;
          
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          if (progress >= 100) {
            return false;
          }
        }
        
        return true;
      });
      
      // Se o ciclo foi limpo, atualizar
      if (cleanedCycle.length !== currentCycle.length) {
        updateData.ciclo_atual = cleanedCycle;
      }

      const { error } = await supabase
        .from('user_cycles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Recarregar dados imediatamente
      await loadCycle();
      
      // Forçar atualização das estatísticas globalmente
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      
      // Se foi um novo ciclo, forçar atualização completa
      if (isLastActiveSubject) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cycleUpdated'));
        }, 500);
      }
      
      // Forçar atualização do estado local para refletir mudanças imediatamente
      const { data: updatedCycle } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (updatedCycle) {
        setUserCycle(updatedCycle);
        
        // Se foi iniciado um novo ciclo, mostrar mensagem adicional
        if (isLastActiveSubject && updatedCycle.materias_estudadas_ciclo?.length === 0) {
          toast.info(`📊 Estatísticas atualizadas: Ciclo #${updatedCycle.ciclos_realizados || 0} com ${updatedCycle.ciclo_atual?.length || 0} matérias ativas.`);
        }
      }
      
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

  // Verificar se uma matéria foi estudada no ciclo atual (versão otimizada)
  const isSubjectStudied = useCallback((subjectId: string): boolean => {
    if (!userCycle?.materias_estudadas_ciclo) return false;
    return userCycle.materias_estudadas_ciclo.includes(subjectId);
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

  // Obter estatísticas completas do ciclo atual
  const getCycleStats = useCallback(async () => {
    if (!user) return null;
    
    try {
      // Buscar dados do ciclo (sempre buscar dados frescos)
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (cycleError || !cycleData) {
        console.error('Erro ao buscar ciclo:', cycleError);
        return null;
      }
      
      // Atualizar o estado local com os dados mais recentes
      setUserCycle(cycleData);
      
      // Buscar dados das matérias
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id);
      
      if (subjectsError || !subjects) {
        console.error('Erro ao buscar matérias:', subjectsError);
        return null;
      }
      
      // Separar matérias ativas (não 100% concluídas) das 100% concluídas
      const activeSubjectsInCycle: string[] = [];
      const completedSubjectsInCycle: string[] = [];
      
      (cycleData.ciclo_atual || []).forEach((id: string) => {
        const subject = subjects.find(s => s.id === id);
        if (!subject) return;
        
        if (subject.topics && subject.topics.length > 0) {
          const completedTopics = subject.topics.filter(topic =>
            topic.reviewStage === 'Concluído'
          ).length;
          
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          if (progress >= 100) {
            completedSubjectsInCycle.push(id);
          } else {
            activeSubjectsInCycle.push(id);
          }
        } else {
          // Matérias sem tópicos são consideradas ativas
          activeSubjectsInCycle.push(id);
        }
      });
      
      // Contar apenas matérias ativas que foram estudadas
      const studiedActiveSubjects = (cycleData.materias_estudadas_ciclo || []).filter(id => 
        activeSubjectsInCycle.includes(id)
      );
      
      const totalSubjects = cycleData.ciclo_atual?.length || 0;
      const totalActiveSubjects = activeSubjectsInCycle.length;
      const studiedSubjects = studiedActiveSubjects.length;
      const remainingSubjects = Math.max(0, totalActiveSubjects - studiedSubjects);
      
      const stats = {
        totalSubjects,
        totalActiveSubjects: activeSubjectsInCycle.length,
        totalCompletedSubjects: completedSubjectsInCycle.length,
        studiedSubjects,
        remainingSubjects,
        activeSubjects: activeSubjectsInCycle.length,
        cycleNumber: cycleData.ciclos_realizados || 0,
        cycleStartDate: cycleData.data_inicio_ciclo,
        studiedSubjectIds: cycleData.materias_estudadas_ciclo || [],
        studiedActiveSubjectIds: studiedActiveSubjects,
        allSubjectIds: cycleData.ciclo_atual || [],
        activeSubjectIds: activeSubjectsInCycle,
        completedSubjectIds: completedSubjectsInCycle
      };
      
      // Estatísticas calculadas
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas do ciclo:', error);
      return null;
    }
  }, [user]);

  // Carregar dados quando o componente monta
  useEffect(() => {
    loadCycle();
  }, [user]); // Usar apenas user como dependência

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