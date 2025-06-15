
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';
import { generateNextDay } from '@/utils/cycleUtils';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useStudySession = () => {
  const { user } = useAuth();
  const { subjects, updateTopic, refreshData } = useApp();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [isNextDayLoading, setIsNextDayLoading] = useState(false);

  const handleNextDay = async (userCycle: UserCycle, setUserCycle: any, setShowNewCycleMessage: any, setIsCycleCompleted: any) => {
    if (!user || !userCycle) return;

    setIsNextDayLoading(true);
    try {
      const result = await generateNextDay(user.id, userCycle, subjects);
      const updatedCycle = await loadUserCycle(user.id);
      setUserCycle(updatedCycle);
      await refreshData();
      
      const hasMatériasParaHoje = updatedCycle.disciplinas_do_dia && updatedCycle.disciplinas_do_dia.length > 0;
      if (result.shouldShowNewCycleMessage && !hasMatériasParaHoje) {
        setShowNewCycleMessage(true);
        setIsCycleCompleted(true);
      }
    } catch (error) {
      console.error('Erro ao gerar próximo dia:', error);
      toast.error('Erro ao carregar próximas matérias');
    } finally {
      setIsNextDayLoading(false);
    }
  };

  const handleCompleteSession = async (subjectId: string, userCycle: UserCycle, tempMarkedTopics: Record<string, string[]>, setUserCycle: any, setTempMarkedTopics: any) => {
    console.log('🔵 handleCompleteSession INICIADO:', {
      subjectId,
      user: !!user,
      userCycle: !!userCycle,
      tempMarkedTopics,
      subjects: subjects.length
    });

    if (!user || !userCycle) {
      console.error('❌ handleCompleteSession: user ou userCycle não disponível');
      return;
    }

    try {
      console.log('🔵 Procurando matéria:', subjectId);
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        console.error('❌ Matéria não encontrada:', subjectId);
        toast.error('Matéria não encontrada');
        return;
      }

      console.log('🔵 Matéria encontrada:', subject.name);
      const topicsToReview = tempMarkedTopics[subjectId] || [];
      console.log('🔵 Tópicos marcados para revisão:', topicsToReview.length);

      if (topicsToReview.length > 0) {
        console.log('🔵 Processando tópicos marcados para revisão...');
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('review_profile')
          .eq('user_id', user.id)
          .single();
        if (settingsError) throw settingsError;
        const profile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
        const { intervals } = REVIEW_PROFILES[profile];
        const firstInterval = intervals[0];
        const reviewStage = firstInterval === 1 ? '24h' : `${firstInterval}d`;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + firstInterval);

        for (const topicId of topicsToReview) {
          console.log('🔵 Atualizando tópico:', topicId);
          await updateTopic(subjectId, topicId, {
            reviewCount: 1,
            reviewStage,
            nextReview,
            completed: false
          });
        }
        console.log('✅ Todos os tópicos atualizados');
      }

      // Limpar tópicos marcados temporariamente
      console.log('🔵 Limpando tópicos marcados temporariamente...');
      setTempMarkedTopics(prev => ({ ...prev, [subjectId]: [] }));

      // Sempre remover das disciplinas_do_dia
      const updatedDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      console.log('🔵 Removendo de disciplinas_do_dia:', {
        antes: userCycle.disciplinas_do_dia.length,
        depois: updatedDisciplinasDoDia.length
      });
      
      // Só remover do ciclo_atual se algum tópico foi marcado para revisão
      const updatedCicloAtual = topicsToReview.length > 0 
        ? userCycle.ciclo_atual.filter(id => id !== subjectId)
        : userCycle.ciclo_atual; // Manter no ciclo se nenhum tópico foi marcado
      
      console.log('🔵 Lógica do ciclo_atual:', {
        subjectId,
        topicsMarkedForReview: topicsToReview.length,
        removingFromCycle: topicsToReview.length > 0,
        cicloAtual_antes: userCycle.ciclo_atual.length,
        cicloAtual_depois: updatedCicloAtual.length,
        disciplinasDoDia_antes: userCycle.disciplinas_do_dia.length,
        disciplinasDoDia_depois: updatedDisciplinasDoDia.length
      });
      
      console.log('🔵 Atualizando banco de dados...');
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: updatedCicloAtual,
          disciplinas_do_dia: updatedDisciplinasDoDia,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar ciclo:', updateError);
        throw updateError;
      }

      console.log('✅ Banco de dados atualizado');
      console.log('🔵 Carregando ciclo atualizado...');
      const freshCycle = await loadUserCycle(user.id);
      if (!freshCycle) {
        throw new Error('Erro ao carregar ciclo atualizado');
      }
      
      console.log('🔵 Ciclo carregado:', freshCycle);
      setUserCycle(freshCycle);

      console.log('🔵 Atualizando dados da aplicação...');
      await refreshData();
      
      console.log('✅ handleCompleteSession FINALIZADO COM SUCESSO');
      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
  };

  return {
    expandedSubject,
    setExpandedSubject,
    isNextDayLoading,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand
  };
};
