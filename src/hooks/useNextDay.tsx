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

      // Selecionar próximas matérias respeitando a ORDEM do ciclo_atual
      let nextBatchIds = [];
      
      // Começar do início do ciclo e pegar as próximas disponíveis
      for (const subjectId of userCycle.ciclo_atual) {
        if (nextBatchIds.length >= subjectsPerDay) break;
        
        const isAvailable = availableSubjectsInCycle.includes(subjectId);
        
        console.log(`🔍 Verificando matéria ${subjectId}:`, {
          isAvailable,
          subjectName: subjects.find(s => s.id === subjectId)?.name || 'NOT_FOUND'
        });
        
        if (isAvailable) {
          nextBatchIds.push(subjectId);
          console.log(`✅ Matéria ${subjectId} adicionada ao próximo lote (${nextBatchIds.length}/${subjectsPerDay})`);
        }
      }

      console.log('📋 Próximo lote selecionado (do ciclo atual):', {
        nextBatchIds,
        quantidade: nextBatchIds.length,
        quantidadeConfigurada: subjectsPerDay,
        materias: nextBatchIds.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
      });

      // Atualizar disciplinas_do_dia com as próximas matérias
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
