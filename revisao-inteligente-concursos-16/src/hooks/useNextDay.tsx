import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useNextDay = () => {
  const { user } = useAuth();
  const { subjects, refreshData } = useApp();
  const [isNextDayLoading, setIsNextDayLoading] = useState(false);

  const handleNextDay = async (
    userCycle: UserCycle,
    setUserCycle: any,
    setShowNewCycleMessage: any,
    setIsCycleCompleted: any
  ) => {
    if (!user || !userCycle) return;

    setIsNextDayLoading(true);
    try {
      console.log('🔄 handleNextDay iniciado:', {
        ciclo_atual: userCycle.ciclo_atual,
        disciplinas_do_dia_atual: userCycle.disciplinas_do_dia
      });

      // Get user settings for subjects_per_day
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

      const subjectsPerDay = userSettings?.subjects_per_day || 3;
      console.log('📋 Matérias por dia configuradas:', subjectsPerDay);

      // Filtrar matérias do ciclo atual que têm tópicos não revisados
      let availableSubjectsInCycle = [];
      if (userCycle.ciclo_atual && userCycle.ciclo_atual.length > 0) {
        availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
          const subject = subjects.find(s => s.id === id);
          if (!subject || subject.status === 'Concluída') return false;
          if (!subject.topics || subject.topics.length === 0) return false;

          // Verificar se há tópicos não revisados (reviewCount/review_count === 0 OU undefined/null)
          const hasUnreviewedTopics = subject.topics.some(t => {
            const reviewCount = t.reviewCount || t.review_count || 0;
            return reviewCount === 0;
          });

          console.log(`🔍 Verificando matéria ${subject.name}:`, {
            id: subject.id,
            status: subject.status,
            topicsCount: subject.topics.length,
            hasUnreviewedTopics,
            topics: subject.topics.map(t => ({
              name: t.name,
              reviewCount: t.reviewCount,
              review_count: t.review_count,
              reviewStage: t.reviewStage,
              isUnreviewed: (t.reviewCount || t.review_count || 0) === 0
            }))
          });

          return hasUnreviewedTopics;
        });
      }

      console.log('🔄 Matérias disponíveis para próximo lote (ciclo atual):', {
        availableSubjectsInCycle: availableSubjectsInCycle.length,
        subjectsPerDay,
        availableIds: availableSubjectsInCycle.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
      });

      // CORREÇÃO: Se não há matérias no ciclo atual, iniciar NOVO CICLO
      if (availableSubjectsInCycle.length === 0) {
        console.log('🔄 Ciclo atual vazio, iniciando NOVO CICLO...');

        // Verificar se há matérias pendentes do ciclo anterior
        const materiasPendentes = userCycle.materias_pendentes || [];
        console.log('🔄 Matérias pendentes do ciclo anterior:', {
          count: materiasPendentes.length,
          materias: materiasPendentes.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
        });

        // Buscar matérias disponíveis (pendentes + outras com tópicos não revisados)
        const availableForNewCycle = subjects.filter(subject => {
          if (subject.status === 'Concluída') return false;
          if (!subject.topics || subject.topics.length === 0) return false;

          // Verificar se há tópicos não revisados
          const hasUnreviewedTopics = subject.topics.some(topic => {
            const reviewCount = topic.reviewCount || topic.review_count || 0;
            return reviewCount === 0;
          });

          return hasUnreviewedTopics;
        });

        console.log('🔄 Matérias disponíveis para NOVO CICLO:', {
          totalAvailable: availableForNewCycle.length,
          subjects: availableForNewCycle.map(s => ({ id: s.id, name: s.name }))
        });

        if (availableForNewCycle.length === 0) {
          console.log('🎉 Nenhuma matéria disponível - estudos completos');
          toast.success('Parabéns! Você completou todos os estudos!');
          return;
        }

        // Ordenar por prioridade (matérias pendentes primeiro, depois por priority)
        const sortedSubjects = [...availableForNewCycle].sort((a, b) => {
          const aIsPending = materiasPendentes.includes(a.id);
          const bIsPending = materiasPendentes.includes(b.id);

          // Matérias pendentes têm prioridade
          if (aIsPending && !bIsPending) return -1;
          if (!aIsPending && bIsPending) return 1;

          // Se ambas são pendentes ou ambas não são, ordenar por priority
          return (a.priority || 999) - (b.priority || 999);
        });

        // Criar novo ciclo com TODAS as matérias disponíveis
        const newCycleIds = sortedSubjects.map(s => s.id);
        const nextBatchIds = newCycleIds.slice(0, subjectsPerDay);

        console.log('🔄 NOVO CICLO criado:', {
          ciclo_completo: newCycleIds.length,
          primeiro_lote: nextBatchIds.length,
          materias_ciclo: newCycleIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND'),
          primeiro_lote_materias: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
        });

        const { error } = await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: newCycleIds, // NOVO CICLO COMPLETO
            disciplinas_do_dia: nextBatchIds, // PRIMEIRO LOTE DO NOVO CICLO
            indice_atual: nextBatchIds.length, // ÍNDICE APÓS O PRIMEIRO LOTE
            materias_pendentes: [], // LIMPAR PENDENTES
            ciclos_realizados: (userCycle.ciclos_realizados || 0) + 1,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error creating new cycle:', error);
          throw error;
        }

        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
        await refreshData();

        toast.success('Novo ciclo iniciado!');
        return;
      }

      // LÓGICA CORRIGIDA: Sempre começar do índice atual e buscar matérias sequencialmente
      const currentIndex = userCycle.indice_atual || 0;
      console.log('🔄 Selecionando próximas matérias baseado no índice CORRIGIDO:', {
        indice_atual: currentIndex,
        ciclo_atual_length: userCycle.ciclo_atual.length,
        subjects_per_day: subjectsPerDay,
        available_subjects_in_cycle: availableSubjectsInCycle.length,
        ciclo_atual: userCycle.ciclo_atual.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
      });

      const nextBatchIds = [];
      let searchIndex = currentIndex;
      let cycleCompleted = false;

      // CORREÇÃO FUNDAMENTAL: Buscar matérias sequencialmente, permitindo dar a volta no ciclo
      while (nextBatchIds.length < subjectsPerDay && !cycleCompleted) {
        // Se chegou ao final do ciclo, voltar ao início
        if (searchIndex >= userCycle.ciclo_atual.length) {
          searchIndex = 0;
        }

        // CORREÇÃO: Evitar loop infinito - se já percorreu todo o ciclo
        if (nextBatchIds.length > 0 && searchIndex === currentIndex) {
          console.log('🔄 Completou um ciclo completo, parando busca');
          cycleCompleted = true;
          break;
        }

        const subjectId = userCycle.ciclo_atual[searchIndex];
        const subject = subjects.find(s => s.id === subjectId);

        // Verificar se a matéria está disponível (tem tópicos não revisados)
        const isAvailable = availableSubjectsInCycle.includes(subjectId);

        console.log(`🔍 Verificando matéria [${searchIndex}]: ${subject?.name || 'NOT_FOUND'}`, {
          subjectId,
          isAvailable,
          hasSubject: !!subject,
          status: subject?.status,
          topicsCount: subject?.topics?.length || 0,
          searchIndex,
          nextBatchLength: nextBatchIds.length,
          cyclePosition: `${searchIndex + 1}/${userCycle.ciclo_atual.length}`
        });

        if (subject && isAvailable && subject.status !== 'Concluída' && subject.topics && subject.topics.length > 0) {
          console.log(`✅ Matéria ${subject.name} adicionada ao próximo lote (${nextBatchIds.length + 1}/${subjectsPerDay})`);
          nextBatchIds.push(subjectId);
        }

        searchIndex++;

        // PROTEÇÃO MELHORADA: Evitar loop infinito
        const totalIterations = searchIndex >= currentIndex
          ? searchIndex - currentIndex
          : (userCycle.ciclo_atual.length - currentIndex) + searchIndex;

        if (totalIterations > userCycle.ciclo_atual.length) {
          console.log('⚠️ Proteção contra loop infinito ativada:', {
            totalIterations,
            ciclo_length: userCycle.ciclo_atual.length,
            currentIndex,
            searchIndex,
            nextBatchLength: nextBatchIds.length
          });
          break;
        }
      }

      console.log('📋 Próximo lote selecionado (do ciclo atual):', {
        nextBatchIds,
        quantidade: nextBatchIds.length,
        quantidadeConfigurada: subjectsPerDay,
        materias: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND'),
        indices_selecionados: nextBatchIds.map(id => userCycle.ciclo_atual.indexOf(id)),
        ciclo_completo: userCycle.ciclo_atual.map((id, index) => ({
          index,
          id,
          name: subjects.find(s => s.id === id)?.name || 'NOT_FOUND',
          selecionado: nextBatchIds.includes(id)
        }))
      });

      // LÓGICA CORRIGIDA: Calcular novo índice baseado na sequência de seleção
      let newIndex = currentIndex;

      if (nextBatchIds.length > 0) {
        // Encontrar o índice da última matéria selecionada no ciclo
        const lastSelectedId = nextBatchIds[nextBatchIds.length - 1];
        const lastSelectedIndex = userCycle.ciclo_atual.indexOf(lastSelectedId);

        if (lastSelectedIndex !== -1) {
          // Próximo índice será após a última matéria selecionada
          newIndex = lastSelectedIndex + 1;

          // Se chegou ao final do ciclo, voltar ao início
          if (newIndex >= userCycle.ciclo_atual.length) {
            newIndex = 0;
          }
        }
      } else {
        // Se não conseguiu selecionar nenhuma matéria, manter o índice atual
        console.log('⚠️ Nenhuma matéria foi selecionada, mantendo índice atual');
      }

      console.log('📊 Atualizando índice do ciclo CORRIGIDO:', {
        indice_atual_antes: currentIndex,
        indice_atual_depois: newIndex,
        materias_selecionadas: nextBatchIds.length,
        ciclo_length: userCycle.ciclo_atual.length,
        ultima_materia_selecionada: nextBatchIds.length > 0 ? subjects.find(s => s.id === nextBatchIds[nextBatchIds.length - 1])?.name : 'NENHUMA',
        materias_selecionadas_nomes: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND'),
        logica: 'sequencial_com_wrap_around'
      });

      // VALIDAÇÃO FINAL: Garantir que o índice seja válido
      const finalIndex = Math.max(0, Math.min(newIndex, userCycle.ciclo_atual.length - 1));

      console.log('🔧 Validação final do índice:', {
        newIndex_calculado: newIndex,
        finalIndex_validado: finalIndex,
        ciclo_length: userCycle.ciclo_atual.length,
        ajuste_necessario: newIndex !== finalIndex
      });

      // Atualizar disciplinas_do_dia com as próximas matérias E o novo índice
      const { error } = await supabase
        .from('user_cycles')
        .update({
          disciplinas_do_dia: nextBatchIds,
          indice_atual: finalIndex,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user cycle:', error);
        throw error;
      }

      console.log('✅ Ciclo atualizado no banco de dados');

      // Recarregar o ciclo atualizado
      const updatedCycle = await loadUserCycle(user.id);
      setUserCycle(updatedCycle);
      await refreshData();

      console.log('✅ handleNextDay finalizado com sucesso');

    } catch (error) {
      console.error('Erro ao gerar próximo dia:', error);
      toast.error('Erro ao carregar próximas matérias');
    } finally {
      setIsNextDayLoading(false);
    }
  };

  return { handleNextDay, isNextDayLoading };
};
