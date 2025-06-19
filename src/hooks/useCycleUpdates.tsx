
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject, UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useCycleUpdates = (
  subjects: Subject[],
  userSettings: { subjects_per_day: number } | null,
  userCycle: UserCycle | null,
  setUserCycle: (cycle: any) => void
) => {
  const { user } = useAuth();
  const lastSubjectsPerDay = useRef<number | null>(null);
  const isUpdatingFromSessionCompletion = useRef<boolean>(false);

  // Função para marcar que uma atualização é resultado de conclusão de sessão
  const markAsSessionUpdate = () => {
    isUpdatingFromSessionCompletion.current = true;
    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromSessionCompletion.current = false;
    }, 1000);
  };

  useEffect(() => {
    const updateDailySubjects = async () => {
      if (!user || !userCycle || !userSettings || userCycle.ciclo_atual.length === 0) return;
      
      // CORREÇÃO PRINCIPAL: Não atualizar se foi resultado de conclusão de sessão
      if (isUpdatingFromSessionCompletion.current) {
        console.log('🔄 Skipping update - resultado de conclusão de sessão');
        return;
      }
      
      // Só atualizar se o subjects_per_day realmente mudou
      if (lastSubjectsPerDay.current === userSettings.subjects_per_day) {
        return;
      }
      
      // CORREÇÃO: Não atualizar se as disciplinas_do_dia estão vazias
      // (pode ser resultado de "Concluir Sessão" que ainda não foi marcado)
      if (userCycle.disciplinas_do_dia.length === 0) {
        console.log('🔄 Skipping update - disciplinas_do_dia está vazio (possivelmente após Concluir Sessão)');
        lastSubjectsPerDay.current = userSettings.subjects_per_day;
        return;
      }
      
      console.log('🔄 Detectada mudança REAL em subjects_per_day (configuração):', userSettings.subjects_per_day);
      
      const currentDailyCount = userCycle.disciplinas_do_dia.length;
      const newCount = userSettings.subjects_per_day;
      
      if (currentDailyCount === newCount) {
        console.log('🔄 Quantidade já está correta, não há mudança necessária');
        lastSubjectsPerDay.current = userSettings.subjects_per_day;
        return;
      }
      
      console.log('🔄 Atualizando disciplinas_do_dia POR MUDANÇA DE CONFIGURAÇÃO:', {
        de: currentDailyCount,
        para: newCount,
        ciclo_atual: userCycle.ciclo_atual
      });
      
      const availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
        const subject = subjects.find(s => s.id === id);
        return subject && subject.status !== 'Concluída' && 
               subject.topics && subject.topics.length > 0 &&
               subject.topics.some(t => t.review_count === 0);
      });
      
      const newDailySubjects = availableSubjectsInCycle.slice(0, newCount);
      
      console.log('🔄 Novas disciplinas do dia (por configuração):', {
        availableInCycle: availableSubjectsInCycle.length,
        selected: newDailySubjects.length,
        newDailySubjects
      });
      
      try {
        const { error } = await supabase
          .from('user_cycles')
          .update({
            disciplinas_do_dia: newDailySubjects,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
        
        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
        
        console.log('✅ disciplinas_do_dia atualizado com sucesso (por configuração)');
        lastSubjectsPerDay.current = userSettings.subjects_per_day;
      } catch (error) {
        console.error('Erro ao atualizar disciplinas_do_dia:', error);
      }
    };

    updateDailySubjects();
  }, [userSettings?.subjects_per_day, user, userCycle?.id, subjects, setUserCycle]);

  // Expor função para que useSessionCompletion possa marcar updates
  return { markAsSessionUpdate };
};
