
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
      console.log('🔄 handleNextDay iniciado - carregando próximas matérias:', {
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

      // Filtrar matérias disponíveis do ciclo atual que não estão nas disciplinas_do_dia
      const availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
        // Não incluir matérias que já estão no dia atual
        if (userCycle.disciplinas_do_dia.includes(id)) return false;
        
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
        console.log('🏁 Nenhuma matéria disponível - fim do ciclo');
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
