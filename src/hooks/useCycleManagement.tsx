
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserCycle, Subject } from '@/types';
import { toast } from 'sonner';
import { loadUserCycle } from '@/utils/cycleUtils';

export const useCycleManagement = (subjects: Subject[], userSettings: { subjects_per_day: number } | null) => {
  const { user } = useAuth();
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isCycleCompleted, setIsCycleCompleted] = useState(false);
  const [isStartingNewCycle, setIsStartingNewCycle] = useState(false);
  const [isCycleLoading, setIsCycleLoading] = useState(true);
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [showNewCycleStarted, setShowNewCycleStarted] = useState(false);

  // Inicializar ciclo otimizado
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
  }, [user, subjects, userSettings]);

  // Função para iniciar novo ciclo automaticamente
  const autoStartNewCycle = useCallback(async () => {
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
      await handleStartNewCycle();
    }
  }, [user, userCycle, userSettings]);

  // Iniciar novo ciclo
  const handleStartNewCycle = async () => {
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

  // Verificar estado do ciclo
  useEffect(() => {
    if (!userCycle) return;
    const cycleCompleted = userCycle.ciclo_atual.length === 0 && Boolean(userCycle.data_fim_ciclo);
    setIsCycleCompleted(cycleCompleted);
  }, [userCycle]);

  const handleHideNewCycleMessage = () => {
    setShowNewCycleMessage(false);
  };

  return {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    isStartingNewCycle,
    isCycleLoading,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    handleStartNewCycle,
    handleHideNewCycleMessage,
    autoStartNewCycle
  };
};
