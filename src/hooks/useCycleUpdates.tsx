
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject, UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useCycleUpdates = (
  subjects: Subject[],
  userSettings: { subjects_per_day: number } | null,
  userCycle: UserCycle | null,
  setUserCycle: (cycle: unknown) => void
) => {
  const { user } = useAuth();
  const lastSubjectsPerDay = useRef<number | null>(null);

  useEffect(() => {
    const handleConfigurationChange = async () => {
      if (!user || !userCycle || !userSettings || userCycle.ciclo_atual.length === 0) return;
      
      // CORREÇÃO PRINCIPAL: Só atualizar se o subjects_per_day realmente mudou E é uma mudança de configuração
      if (lastSubjectsPerDay.current === userSettings.subjects_per_day) {
        return;
      }
      
      // NOVA LÓGICA: Só ajustar se é uma mudança explícita de configuração
      // (não interferir quando disciplinas_do_dia fica vazio por conclusão de sessão)
      if (lastSubjectsPerDay.current === null) {
        // Primeira inicialização - apenas registrar o valor atual
        console.log('🔧 useCycleUpdates - Primeira inicialização, registrando valor:', userSettings.subjects_per_day);
        lastSubjectsPerDay.current = userSettings.subjects_per_day;
        return;
      }
      
      console.log('🔧 useCycleUpdates - Detectada mudança de configuração (subjects_per_day):', {
        de: lastSubjectsPerDay.current,
        para: userSettings.subjects_per_day,
        disciplinas_do_dia_atual: userCycle.disciplinas_do_dia.length
      });
      
      // Só fazer ajuste se há uma mudança real de configuração
      const currentDailyCount = userCycle.disciplinas_do_dia.length;
      const newCount = userSettings.subjects_per_day;
      
      // Se o usuário aumentou o número de matérias por dia, adicionar mais
      if (newCount > currentDailyCount) {
        console.log('🔧 Usuário aumentou matérias por dia, adicionando mais...');
        
        const availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
          // Não incluir matérias que já estão no dia
          if (userCycle.disciplinas_do_dia.includes(id)) return false;
          
          const subject = subjects.find(s => s.id === id);
          return subject && subject.status !== 'Concluída' && 
                 subject.topics && subject.topics.length > 0 &&
                 subject.topics.some(t => t.review_count === 0);
        });
        
        const additionalSubjects = availableSubjectsInCycle.slice(0, newCount - currentDailyCount);
        const newDailySubjects = [...userCycle.disciplinas_do_dia, ...additionalSubjects];
        
        console.log('🔧 Adicionando matérias por mudança de configuração:', {
          adicionar: additionalSubjects.length,
          novas_disciplinas_do_dia: newDailySubjects
        });
        
        await updateDailySubjects(newDailySubjects);
      }
      // Se o usuário diminuiu o número de matérias por dia, remover as últimas
      else if (newCount < currentDailyCount) {
        console.log('🔧 Usuário diminuiu matérias por dia, removendo últimas...');
        
        const newDailySubjects = userCycle.disciplinas_do_dia.slice(0, newCount);
        
        console.log('🔧 Removendo matérias por mudança de configuração:', {
          remover: currentDailyCount - newCount,
          novas_disciplinas_do_dia: newDailySubjects
        });
        
        await updateDailySubjects(newDailySubjects);
      }
      
      lastSubjectsPerDay.current = userSettings.subjects_per_day;
    };

    const updateDailySubjects = async (newDailySubjects: string[]) => {
      try {
        const { error } = await supabase
          .from('user_cycles')
          .update({
            disciplinas_do_dia: newDailySubjects,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user!.id);

        if (error) throw error;
        
        const updatedCycle = await loadUserCycle(user!.id);
        setUserCycle(updatedCycle);
        
        console.log('✅ disciplinas_do_dia atualizado por mudança de configuração');
      } catch (error) {
        console.error('❌ Erro ao atualizar disciplinas_do_dia:', error);
      }
    };

    handleConfigurationChange();
  }, [subjects, setUserCycle, user, userCycle, userSettings]);

  // Função vazia - não é mais necessária
  const markAsSessionUpdate = () => {
    // Função removida - não é mais necessária com a nova lógica simplificada
  };

  return { markAsSessionUpdate };
};
