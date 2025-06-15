
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCycle } from '@/types';
import { loadUserCycle } from '@/utils/cycleUtils';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';

export const useSessionCompletion = () => {
  const { user } = useAuth();
  const { subjects, updateTopic, refreshData } = useApp();

  const handleCompleteSession = async (
    subjectId: string, 
    userCycle: UserCycle, 
    tempMarkedTopics: Record<string, string[]>, 
    setUserCycle: any, 
    setTempMarkedTopics: any
  ) => {
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

      // SEMPRE remover a matéria tanto das disciplinas_do_dia quanto do ciclo_atual
      // quando uma sessão é concluída, independentemente de tópicos marcados
      const updatedDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      const updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
      
      console.log('🔵 Removendo matéria do ciclo após concluir sessão:', {
        subjectId,
        subject: subject.name,
        topicsMarkedForReview: topicsToReview.length,
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

  return { handleCompleteSession };
};
