
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject, UserCycle } from '@/types';
import { toast } from 'sonner';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useNewCycleManagement = (
  subjects: Subject[],
  userSettings: { subjects_per_day: number } | null,
  setUserCycle: (cycle: any) => void,
  setIsCycleCompleted: (completed: boolean) => void
) => {
  const { user } = useAuth();
  const [isStartingNewCycle, setIsStartingNewCycle] = useState(false);
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [showNewCycleStarted, setShowNewCycleStarted] = useState(false);

  const autoStartNewCycle = useCallback(async (userCycle: UserCycle) => {
    if (!user || !userCycle || !userSettings) return;

    console.log('🔄 Verificando se deve iniciar novo ciclo automaticamente:', {
      ciclo_atual_length: userCycle.ciclo_atual?.length,
      materias_pendentes_length: userCycle.materias_pendentes?.length
    });

    const shouldAutoStart = (!userCycle.ciclo_atual || userCycle.ciclo_atual.length === 0) && 
                           userCycle.materias_pendentes && 
                           userCycle.materias_pendentes.length > 0;

    if (shouldAutoStart) {
      console.log('🔄 Iniciando novo ciclo automaticamente...');
      await handleStartNewCycle(userCycle);
    }
  }, [user, userSettings]);

  const handleStartNewCycle = async (userCycle?: UserCycle) => {
    if (!user || !userCycle) return;

    setIsStartingNewCycle(true);
    try {
      console.log('🔄 Iniciando novo ciclo - analisando matérias:', {
        materias_pendentes: userCycle.materias_pendentes,
        ciclo_atual: userCycle.ciclo_atual
      });

      const availableSubjects = subjects.filter(s => s.status !== 'Concluída');
      
      const pendingSubjects = (userCycle.materias_pendentes || [])
        .map(id => availableSubjects.find(s => s.id === id))
        .filter(Boolean);
      
      const previousCycleSubjects = (userCycle.ciclo_atual || [])
        .map(id => availableSubjects.find(s => s.id === id))
        .filter(subject => {
          if (!subject || !subject.topics || subject.topics.length === 0) return false;
          return subject.topics.some(topic => topic.review_count === 0);
        });
      
      const allSubjectsForNewCycle = [...pendingSubjects, ...previousCycleSubjects]
        .filter((subject, index, self) => 
          subject && self.findIndex(s => s && s.id === subject.id) === index
        );
      
      const sortedSubjects = allSubjectsForNewCycle.sort((a, b) => (a.priority || 999) - (b.priority || 999));
      const sortedSubjectIds = sortedSubjects.map(s => s.id);
      
      const subjectsPerDay = userSettings?.subjects_per_day || 3;

      await supabase.from('user_cycles').delete().eq('user_id', user.id);
      await supabase.from('subjects').update({ status: 'Nova' }).eq('user_id', user.id);

      if (sortedSubjectIds.length > 0) {
        await supabase
          .from('user_cycles')
          .insert({
            user_id: user.id,
            ciclo_atual: sortedSubjectIds,
            disciplinas_do_dia: sortedSubjectIds.slice(0, subjectsPerDay),
            materias_pendentes: [],
            data_inicio_ciclo: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          });
      }

      const newCycle = await loadUserCycle(user.id);
      setUserCycle(newCycle);
      setIsCycleCompleted(false);
      setShowNewCycleMessage(false);
      
      setShowNewCycleStarted(true);
      setTimeout(() => setShowNewCycleStarted(false), 5000);
      
      toast.success('Novo ciclo iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar novo ciclo:', error);
      toast.error('Erro ao iniciar novo ciclo');
    } finally {
      setIsStartingNewCycle(false);
    }
  };

  const handleHideNewCycleMessage = () => {
    setShowNewCycleMessage(false);
  };

  return {
    isStartingNewCycle,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    autoStartNewCycle,
    handleStartNewCycle,
    handleHideNewCycleMessage
  };
};
