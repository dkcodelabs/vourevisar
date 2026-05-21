import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';
import { toastGate } from '@/lib/errors/toastGate';

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

      // Se não há matérias no ciclo atual, buscar TODAS as matérias disponíveis
      if (availableSubjectsInCycle.length === 0) {
        console.log('🔄 Ciclo atual vazio, buscando TODAS as matérias disponíveis');
        
        const allAvailableSubjects = subjects.filter(subject => {
          if (subject.status === 'Concluída') return false;
          if (!subject.topics || subject.topics.length === 0) return false;
          
          // Verificar se há tópicos não revisados
          const hasUnreviewedTopics = subject.topics.some(topic => {
            const reviewCount = topic.reviewCount || topic.review_count || 0;
            return reviewCount === 0;
          });
          
          console.log(`🔍 Verificando matéria GLOBAL ${subject.name}:`, {
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

        console.log('🔄 Matérias disponíveis GLOBALMENTE:', {
          totalAvailable: allAvailableSubjects.length,
          subjects: allAvailableSubjects.map(s => ({ id: s.id, name: s.name }))
        });

        if (allAvailableSubjects.length === 0) {
          console.log('🎉 Nenhuma matéria disponível - estudos completos');
          toast.success('Parabéns! Você completou todos os estudos!');
          return;
        }

        const sortedSubjects = [...allAvailableSubjects].sort((a, b) => (a.priority || 999) - (b.priority || 999));
        const nextBatchIds = sortedSubjects.slice(0, subjectsPerDay).map(s => s.id);

        console.log('📋 Próximo lote selecionado (matérias globais):', {
          nextBatchIds,
          quantidade: nextBatchIds.length,
          materias: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
        });

        const { error } = await supabase
          .from('user_cycles')
          .update({
            disciplinas_do_dia: nextBatchIds,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating user cycle:', error);
          throw error;
        }

        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
        await refreshData();

        toast.success('Próximas matérias carregadas!');
        return;
      }

      // CORREÇÃO: Usar indice_atual para determinar próximas matérias do ciclo
      const currentIndex = userCycle.indice_atual || 0;
      console.log('🔄 Selecionando próximas matérias baseado no índice:', {
        indice_atual: currentIndex,
        ciclo_atual_length: userCycle.ciclo_atual.length,
        subjects_per_day: subjectsPerDay,
        available_subjects_in_cycle: availableSubjectsInCycle.length
      });

      const nextBatchIds = [];
      
      // CORREÇÃO: Selecionar matérias sequencialmente a partir do índice atual do ciclo
      // mas apenas matérias que estão disponíveis (têm tópicos não revisados)
      for (let i = 0; i < subjectsPerDay && nextBatchIds.length < subjectsPerDay; i++) {
        const targetIndex = currentIndex + i;
        
        // Se ainda há matérias no ciclo atual
        if (targetIndex < userCycle.ciclo_atual.length) {
          const subjectId = userCycle.ciclo_atual[targetIndex];
          const subject = subjects.find(s => s.id === subjectId);
          
          // Verificar se a matéria está disponível (tem tópicos não revisados)
          const isAvailable = availableSubjectsInCycle.includes(subjectId);
          
          console.log(`🔍 Verificando matéria [${targetIndex}]: ${subject?.name || 'NOT_FOUND'}`, {
            subjectId,
            isAvailable,
            hasSubject: !!subject,
            status: subject?.status,
            topicsCount: subject?.topics?.length || 0
          });
          
          if (subject && isAvailable && subject.status !== 'Concluída' && subject.topics && subject.topics.length > 0) {
            console.log(`✅ Matéria ${subject.name} adicionada ao próximo lote (${nextBatchIds.length + 1}/${subjectsPerDay})`);
            nextBatchIds.push(subjectId);
          }
        }
      }

      console.log('📋 Próximo lote selecionado (do ciclo atual):', {
        nextBatchIds,
        quantidade: nextBatchIds.length,
        quantidadeConfigurada: subjectsPerDay,
        materias: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
      });

      // Atualizar índice - avançar baseado nas matérias selecionadas
      const newIndex = Math.min(currentIndex + nextBatchIds.length, userCycle.ciclo_atual.length);

      console.log('📊 Atualizando índice do ciclo:', {
        indice_atual_antes: currentIndex,
        indice_atual_depois: newIndex,
        materias_selecionadas: nextBatchIds.length,
        ciclo_length: userCycle.ciclo_atual.length
      });

      // Atualizar disciplinas_do_dia com as próximas matérias E o novo índice
      const { error } = await supabase
        .from('user_cycles')
        .update({
          disciplinas_do_dia: nextBatchIds,
          indice_atual: newIndex,
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
      
      // Disparar evento para atualizar estatísticas imediatamente
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      
    } catch (error) {
      console.error('Erro ao gerar próximo dia:', error);
      toastGate.notifyError('Erro ao carregar próximas matérias', 'HOOKS-USENEXTDAY-01', { severity: 'medium' });
    } finally {
      setIsNextDayLoading(false);
    }
  };

  return { handleNextDay, isNextDayLoading };
};
