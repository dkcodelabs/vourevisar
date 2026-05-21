
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject, UserCycle } from '@/types';
import { toast } from '@/lib/toast';
import { loadUserCycle } from '@/utils/cycleUtils';
import { toastGate } from '@/lib/errors/toastGate';

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
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length
    });

    // DESABILITADO: Não iniciar novo ciclo automaticamente
    // O usuário deve clicar no botão para iniciar manualmente
    return;
  }, [user, userSettings, subjects]);

  const handleStartNewCycle = async (userCycle?: UserCycle) => {
    if (!user) return;

    setIsStartingNewCycle(true);
    try {
      console.log('🔄 Iniciando novo ciclo - analisando matérias:', {
        subjects_total: subjects.length
      });

      // CORRIGIDO: Incluir todas as matérias que têm tópicos não revisados
      const availableSubjects = subjects.filter(subject => {
        if (subject.status === 'Concluída') return false;
        if (!subject.topics || subject.topics.length === 0) return false;
        return subject.topics.some(topic => topic.review_count === 0);
      });

      console.log('🔄 Matérias disponíveis para novo ciclo:', {
        available_count: availableSubjects.length,
        subjects: availableSubjects.map(s => s.name)
      });
      
      const sortedSubjects = availableSubjects.sort((a, b) => (a.priority || 999) - (b.priority || 999));
      const sortedSubjectIds = sortedSubjects.map(s => s.id);
      
      const subjectsPerDay = userSettings?.subjects_per_day || 3;

      // Limpar ciclo anterior e resetar status das matérias
      await supabase.from('user_cycles').delete().eq('user_id', user.id);
      await supabase.from('subjects').update({ status: 'Nova' }).eq('user_id', user.id);

      if (sortedSubjectIds.length > 0) {
        const { error } = await supabase
          .from('user_cycles')
          .insert({
            user_id: user.id,
            ciclo_atual: sortedSubjectIds,
            disciplinas_do_dia: sortedSubjectIds.slice(0, subjectsPerDay),
            materias_pendentes: [],
            data_inicio_ciclo: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          });

        if (error) {
          console.error('Erro ao criar novo ciclo:', error);
          throw error;
        }

        console.log('✅ Novo ciclo criado com sucesso:', {
          ciclo_atual: sortedSubjectIds.length,
          disciplinas_do_dia: Math.min(sortedSubjectIds.length, subjectsPerDay)
        });
      }

      const newCycle = await loadUserCycle(user.id);
      setUserCycle(newCycle);
      setIsCycleCompleted(false);
      setShowNewCycleMessage(false);
      
      // NOVO: Mostrar mensagem discreta de novo ciclo iniciado
      setShowNewCycleStarted(true);
      setTimeout(() => setShowNewCycleStarted(false), 5000);
      
      // Disparar evento para atualizar estatísticas imediatamente
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      
      toast.success('Novo ciclo iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar novo ciclo:', error);
      toastGate.notifyError('Erro ao iniciar novo ciclo', 'HOOKS-USENEWCYCLEMANAGEMENT-01', { severity: 'medium' });
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
