import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';
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
