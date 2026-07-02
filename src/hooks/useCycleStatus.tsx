import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Topic } from '@/types';
import { updateStudiedSubjects, addStudiedSubject, resetCycle, isSubjectStudiedGlobal } from '@/utils/cycleState';
import { cleanCycle } from '@/utils/cycleUtils';
import { toastGate } from '@/lib/errors/toastGate';

// Tipo estendido para UserCycle com propriedades adicionais
interface ExtendedUserCycle {
  id: string;
  user_id: string;
  name?: string | null;
  status: 'active' | 'completed' | 'archived';
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  materias_pendentes: string[];
  materias_estudadas_ciclo?: string[];
  materias_estudadas_hoje?: string[];
  ciclos_realizados: number;
  indice_atual?: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
  skipped_subjects?: string[];
  data_ultimo_reset?: string;
  streak_dias_consecutivos?: number;
  materias_por_dia?: number;
}

// Tipo estendido para incluir topics no Subject
interface SubjectWithTopics {
  id: string;
  name: string;
  topics?: Topic[];
  status: string;
  user_id: string;
  [key: string]: unknown;
}

// Sistema de controle de eventos para evitar loops infinitos
let isProcessingCycleUpdate = false;
let lastEventTime = 0;
const EVENT_DEBOUNCE_TIME = 500; // Reduzido para 500ms para melhor responsividade

export const useCycleStatus = () => {
  const { user } = useAuth();
  const [userCycle, setUserCycle] = useState<ExtendedUserCycle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar dados do ciclo
  const loadCycle = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (error) throw error;

      // Log removido para evitar spam

      const typedData = (data?.[0] || null) as ExtendedUserCycle | null;

      // Atualizar estado global
      if (typedData?.materias_estudadas_ciclo) {
        updateStudiedSubjects(typedData.materias_estudadas_ciclo);
      }

      setUserCycle(typedData);
    } catch (error) {
      console.error('Erro ao carregar ciclo:', error);
    }
  }, [user]);

  // Marcar matéria como estudada no ciclo atual
  const markSubjectAsStudied = useCallback(async (subjectId: string, subjectName: string, silent: boolean = false) => {
    if (!user || !userCycle) return false;

    setIsLoading(true);
    try {
      // Buscar estado atual do banco
      const { data: freshCycle, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      const typedFreshCycle = (freshCycle?.[0] || null) as ExtendedUserCycle | null;

      if (cycleError || !typedFreshCycle) {
        console.error('Erro ao buscar ciclo atual:', cycleError);
        return false;
      }

      const currentStudied = typedFreshCycle.materias_estudadas_ciclo || [];

      // Se já está estudada, não fazer nada
      if (currentStudied.includes(subjectId)) {
        if (!silent) {
          toast.info(`${subjectName} já foi estudada neste ciclo`);
        }
        return true;
      }

      const newStudied = [...currentStudied, subjectId];

      // Verificar se esta é a última matéria ativa do ciclo (ignorar concluídas)
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select(`
          *,
          topics:topics(*)
        `)
        .eq('user_id', user.id);

      if (!allSubjects) throw new Error('Erro ao carregar matérias');

      const typedSubjects = allSubjects as unknown as SubjectWithTopics[];

      // Separar matérias ativas das 100% concluídas
      const activeSubjectsInCurrentCycle: string[] = [];
      const completedSubjectsInCurrentCycle: string[] = [];

      typedFreshCycle.ciclo_atual.forEach(id => {
        const subject = typedSubjects.find(s => s.id === id);
        if (!subject) return;

        // Se a matéria não tem tópicos, ela não deve bloquear o ciclo
        if (!subject.topics || subject.topics.length === 0) {
          completedSubjectsInCurrentCycle.push(id);
          return;
        }

        // Verificar se está 100% concluída (TODOS os tópicos devem estar na última revisão OU completed)
        const allTopicsCompleted = subject.topics.every((topic: unknown) => {
          return topic.reviewStage === 'Concluído' ||
            topic.completed === true ||
            topic.reviewStage === '60d';
        });

        if (allTopicsCompleted) {
          completedSubjectsInCurrentCycle.push(id);
          return;
        }

        activeSubjectsInCurrentCycle.push(id);
      });

      // Verificar quantas matérias ativas ainda não foram estudadas (APÓS incluir a atual)
      const unstudiedActiveSubjects = activeSubjectsInCurrentCycle.filter(id => {
        return !newStudied.includes(id);
      });

      // Verificar se esta é a última matéria ativa (APÓS incluir a atual)
      const isLastActiveSubject = unstudiedActiveSubjects.length === 0;

      // Log removido para otimização

      // Obter nomes das matérias para debug
      const unstudiedSubjectNames = unstudiedActiveSubjects.map(id => {
        const subject = typedSubjects.find(s => s.id === id);
        return subject ? subject.name : id;
      });

      const studiedSubjectNames = newStudied.map(id => {
        const subject = typedSubjects.find(s => s.id === id);
        return subject ? subject.name : id;
      });

      // Log removido para otimização

      // Log removido para otimização

      // Log removido para otimização

      let updateData: unknown;
      let newCycleNumberForEvent: number | undefined;

      if (isLastActiveSubject) {
        // É a última matéria - iniciar novo ciclo
        updateData = {
          materias_estudadas_ciclo: [],
          ciclos_realizados: (typedFreshCycle.ciclos_realizados || 0) + 1,
          data_inicio_ciclo: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        console.log('🎉 Iniciando novo ciclo:', {
          cicloAtual: typedFreshCycle.ciclos_realizados,
          novoCiclo: updateData.ciclos_realizados,
          calculo: `${typedFreshCycle.ciclos_realizados || 0} + 1 = ${updateData.ciclos_realizados}`
        });

        // CRÍTICO: Salvar o número do novo ciclo para usar no evento
        newCycleNumberForEvent = updateData.ciclos_realizados;
        console.log('🔍 Salvando número do novo ciclo para evento:', newCycleNumberForEvent);

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

      // Usar utilitário unificado para limpar o ciclo
      const currentCycle = typedFreshCycle.ciclo_atual || [];
      const cleanedCycle = cleanCycle(currentCycle, typedSubjects);

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
        .limit(1);

      const typedUpdatedCycle = (updatedCycle?.[0] || null) as ExtendedUserCycle | null;

      if (typedUpdatedCycle) {
        setUserCycle(typedUpdatedCycle);
        console.log('🔄 Estado local atualizado:', typedUpdatedCycle);

        // CRÍTICO: Atualizar estado global imediatamente
        console.log('🔄 Atualizando estado global com:', typedUpdatedCycle.materias_estudadas_ciclo);
        updateStudiedSubjects(typedUpdatedCycle.materias_estudadas_ciclo || []);

        // CRÍTICO: Forçar re-render de todos os componentes que usam isSubjectStudied
        console.log('🔄 Forçando re-render de componentes...');

        // Forçar atualização do estado local para garantir re-render
        setUserCycle(null); // Limpar primeiro
        setTimeout(() => {
          setUserCycle(typedUpdatedCycle); // Definir novamente para forçar re-render
          console.log('🔄 Estado local forçadamente atualizado para re-render');
        }, 50);

        // LÓGICA SIMPLIFICADA: Verificar se estudos foram concluídos antes de disparar novo ciclo
        if (isLastActiveSubject) {
          // CRÍTICO: Verificar se todos os estudos foram concluídos ANTES de disparar novo ciclo
          const { data: allUserSubjects } = await supabase
            .from('subjects')
            .select(`
              id,
              name,
              topics:topics(id, completed)
            `)
            .eq('user_id', user.id) as { data: SubjectWithTopics[] | null };

          if (allUserSubjects && allUserSubjects.length > 0) {
            const areAllStudiesCompleted = allUserSubjects.every(subject =>
              subject.topics && subject.topics.length > 0 &&
              subject.topics.every((topic: unknown) => topic.completed === true)
            );

            console.log('🔍 Verificação final no useCycleStatus:', {
              totalSubjects: allUserSubjects.length,
              areAllStudiesCompleted,
              subjectsStatus: allUserSubjects.map(s => ({
                name: s.name,
                totalTopics: s.topics?.length || 0,
                completedTopics: s.topics?.filter((t: unknown) => t.completed).length || 0,
                allCompleted: s.topics?.every((t: unknown) => t.completed) || false
              }))
            });

            if (areAllStudiesCompleted) {
              console.log('🚫 NÃO disparando novo ciclo - todos os estudos foram concluídos');
              return true; // Sair sem disparar evento de novo ciclo
            }
          }

          console.log('🔔 DISPARANDO MENSAGEM DE NOVO CICLO');
          console.log(`🎉 Novo ciclo iniciado - última matéria do ciclo completada`);
          // A mensagem de novo ciclo é exibida pela tela ativa de estudos
        }
      }

      // CRÍTICO: Sistema controlado de eventos para evitar loops infinitos
      if (!isProcessingCycleUpdate) {
        isProcessingCycleUpdate = true;

        // Limpar timeout anterior se existir
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
        }

        // Disparar eventos de forma controlada
        reloadTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Disparando eventos de atualização de ciclo (controlado)');

          // Disparar apenas um evento principal
          const newCycleNumber = isLastActiveSubject && typeof newCycleNumberForEvent !== 'undefined'
            ? newCycleNumberForEvent
            : typedUpdatedCycle?.ciclos_realizados || 0;

          console.log('🔍 Disparando evento cycleUpdated com número do ciclo:', {
            isNewCycle: isLastActiveSubject,
            newCycleNumber,
            newCycleNumberForEvent: typeof newCycleNumberForEvent !== 'undefined' ? newCycleNumberForEvent : 'undefined',
            updatedCycleCiclosRealizados: typedUpdatedCycle?.ciclos_realizados
          });

          window.dispatchEvent(new CustomEvent('cycleUpdated', {
            detail: {
              isNewCycle: isLastActiveSubject,
              subjectId,
              subjectName,
              newCycleNumber,
              timestamp: Date.now(),
              forceRerender: true
            }
          }));

          // Se é novo ciclo, disparar evento adicional para forçar re-render
          if (isLastActiveSubject) {
            setTimeout(() => {
              console.log('🔄 Disparando evento de força re-render para novo ciclo');
              window.dispatchEvent(new CustomEvent('forceComponentRerender', {
                detail: { reason: 'newCycle', timestamp: Date.now() }
              }));
            }, 100);
          }

          // Reset do controle após um tempo
          setTimeout(() => {
            isProcessingCycleUpdate = false;
            console.log('🔄 Sistema de controle de eventos resetado');
          }, 2000);

        }, 500); // Delay único de 500ms
      } else {
        console.log('🚫 Evento de ciclo ignorado - já processando atualização');
      }

      // Dados recarregados

      return true;
    } catch (error) {
      console.error('Erro ao marcar matéria como estudada:', error);
      toastGate.notifyError('Erro ao marcar matéria como estudada', 'HOOKS-USECYCLESTATUS-01', { severity: 'medium' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, userCycle]);

  // Verificar se uma matéria foi estudada no ciclo atual (otimizado)
  const isSubjectStudied = useCallback((subjectId: string): boolean => {
    if (!userCycle?.materias_estudadas_ciclo) {
      return false;
    }

    return userCycle.materias_estudadas_ciclo.includes(subjectId);
  }, [userCycle]);

  // Obter próxima matéria sugerida (primeira não estudada e não concluída)
  const getNextSuggestedSubject = useCallback((subjects: unknown[] = []): string | null => {
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
  const isNextSuggested = useCallback((subjectId: string, subject?: unknown): boolean => {
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

    // Log removido para evitar spam

    try {
      // Buscar dados frescos do ciclo atual
      const { data: freshUserCycle, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      const typedFreshUserCycle = (freshUserCycle?.[0] || null) as ExtendedUserCycle | null;

      if (cycleError || !typedFreshUserCycle) {
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

      const currentCycle = typedFreshUserCycle.ciclo_atual || [];
      const cleanedCycle = cleanCycle(currentCycle, allSubjects);

      // Log removido para evitar spam

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
        typedFreshUserCycle.ciclo_atual = cleanedCycle;
      }

      const totalSubjects = cleanedCycle.length;

      // Contar apenas matérias estudadas que AINDA ESTÃO no ciclo limpo
      const studiedInCurrentCycle = (typedFreshUserCycle.materias_estudadas_ciclo || []).filter(studiedId =>
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
        cycleNumber: typedFreshUserCycle.ciclos_realizados || 0,
        cycleStartDate: typedFreshUserCycle.data_inicio_ciclo,
        studiedSubjectIds: typedFreshUserCycle.materias_estudadas_ciclo || [],
        studiedActiveSubjectIds: studiedInCurrentCycle,
        allSubjectIds: cleanedCycle,
        activeSubjectIds: cleanedCycle,
        completedSubjectIds: completedSubjects.map(s => s.id)
      };

      // Log removido para evitar spam

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

    // Sistema de eventos otimizado
    const handleCycleUpdate = (event: unknown) => {
      const now = Date.now();
      const eventDetail = event?.detail;

      const isTopicReview = eventDetail?.source === 'topicReview' || eventDetail?.type === 'topicReview';

      if (!isTopicReview && now - lastEventTime < EVENT_DEBOUNCE_TIME) {
        return;
      }

      lastEventTime = now;

      setTimeout(() => {
        loadCycle();
      }, isTopicReview ? 100 : 300);
    };

    window.addEventListener('cycleUpdated', handleCycleUpdate);
    window.addEventListener('mergeUpdated', handleCycleUpdate);

    return () => {
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
      window.removeEventListener('mergeUpdated', handleCycleUpdate);

      // Limpar timeout se o componente for desmontado
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [user, loadCycle]);

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
