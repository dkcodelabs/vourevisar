
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useCycleInitialization = (
  subjects: Subject[], 
  userSettings: { subjects_per_day: number } | null,
  setUserCycle: (cycle: any) => void
) => {
  const { user } = useAuth();
  const [isCycleLoading, setIsCycleLoading] = useState(true);

  useEffect(() => {
    const initializeCycle = async () => {
      setIsCycleLoading(true);
      if (!user || !subjects.length) {
        setIsCycleLoading(false);
        return;
      }

      const subjectsPerDay = userSettings?.subjects_per_day || 3;

      try {
        const existingCycle = await loadUserCycle(user.id);
        const availableSubjects = subjects.filter(s => s.status !== 'Concluída');

        if (!existingCycle || !existingCycle.id) {
          if (availableSubjects.length > 0) {
            console.log('📝 Criando novo ciclo...');
            const sortedSubjects = [...availableSubjects].sort((a, b) => (a.priority || 999) - (b.priority || 999));
            const cycleSubjectIds = sortedSubjects.map(s => s.id);
            
            const { error } = await supabase
              .from('user_cycles')
              .insert({
                user_id: user.id,
                ciclo_atual: cycleSubjectIds,
                disciplinas_do_dia: cycleSubjectIds.slice(0, subjectsPerDay),
                materias_pendentes: [],
                data_inicio_ciclo: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
              });

            if (error) {
              console.error('Erro ao criar ciclo:', error);
              setIsCycleLoading(false);
              return;
            }

            const newCycle = await loadUserCycle(user.id);
            setUserCycle(newCycle);
          } else {
            setUserCycle(null);
          }
        } else {
          const currentCycleSubjects = existingCycle.ciclo_atual || [];
          const currentPendingSubjects = existingCycle.materias_pendentes || [];
          const newSubjects = availableSubjects.filter(s => 
            !currentCycleSubjects.includes(s.id) && 
            !currentPendingSubjects.includes(s.id)
          );
          
          if (newSubjects.length > 0) {
            console.log('📝 Adicionando novas matérias às pendentes...');
            const updatedPendingSubjects = [...currentPendingSubjects, ...newSubjects.map(s => s.id)];
            
            const { error } = await supabase
              .from('user_cycles')
              .update({
                materias_pendentes: updatedPendingSubjects,
                atualizado_em: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (error) {
              console.error('Erro ao atualizar matérias pendentes:', error);
            }
          }
          
          const updatedCycle = await loadUserCycle(user.id);
          setUserCycle(updatedCycle);
        }
      } catch (error) {
        console.error('Erro ao inicializar ciclo:', error);
      } finally {
        setIsCycleLoading(false);
      }
    };

    initializeCycle();
  }, [user, subjects, userSettings, setUserCycle]);

  return { isCycleLoading };
};
