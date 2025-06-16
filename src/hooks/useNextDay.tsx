
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

      // CORRIGIDO: Se ciclo_atual está vazio, não há próximas matérias - deve iniciar novo ciclo
      if (!userCycle.ciclo_atual || userCycle.ciclo_atual.length === 0) {
        console.log('🏁 Ciclo atual vazio - verificando se há matérias para novo ciclo');
        
        // Verificar se existem matérias com tópicos não revisados para iniciar novo ciclo
        const subjectsWithUnreviewedTopics = subjects.filter(subject => {
          if (subject.status === 'Concluída') return false;
          if (!subject.topics || subject.topics.length === 0) return false;
          return subject.topics.some(topic => topic.review_count === 0);
        });

        if (subjectsWithUnreviewedTopics.length > 0) {
          console.log('🔄 Encontradas matérias para novo ciclo, sinalizando conclusão');
          setShowNewCycleMessage(true);
          setIsCycleCompleted(true);
        } else {
          console.log('🎉 Nenhuma matéria com tópicos não revisados - estudos completos');
          toast.success('Parabéns! Você completou todos os estudos!');
        }
        return;
      }

      // Filtrar matérias disponíveis APENAS do ciclo_atual (que não foram concluídas)
      const availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
        const subject = subjects.find(s => s.id === id);
        return subject && 
               subject.status !== 'Concluída' &&
               subject.topics && subject.topics.length > 0 &&
               subject.topics.some(t => t.review_count === 0); // Só matérias com tópicos não revisados
      });

      console.log('🔄 Matérias disponíveis para próximo lote:', {
        availableSubjectsInCycle: availableSubjectsInCycle.length,
        subjectsPerDay,
        availableIds: availableSubjectsInCycle
      });

      if (availableSubjectsInCycle.length === 0) {
        console.log('🏁 Nenhuma matéria disponível no ciclo atual - fim do ciclo');
        setShowNewCycleMessage(true);
        setIsCycleCompleted(true);
        return;
      }

      // Selecionar próximas matérias respeitando a ordem do ciclo
      const nextBatchIds = availableSubjectsInCycle.slice(0, subjectsPerDay);

      console.log('📋 Próximo lote selecionado:', {
        nextBatchIds,
        quantidade: nextBatchIds.length
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
