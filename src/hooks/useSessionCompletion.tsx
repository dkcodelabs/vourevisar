
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

      // Processar tópicos marcados para revisão
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

      // LÓGICA CORRIGIDA: 
      // 1. SEMPRE remover da lista do dia
      // 2. Mover para final da fila do ciclo atual (independente de ter marcado tópicos ou não)
      // 3. Buscar próximas matérias disponíveis no ciclo atual para subir para as disciplinas do dia
      
      console.log('🔵 Estado atual do ciclo:', {
        ciclo_atual: userCycle.ciclo_atual,
        disciplinas_do_dia: userCycle.disciplinas_do_dia
      });

      // Remover a matéria das disciplinas do dia
      const newDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      
      // Mover a matéria para o final da fila no ciclo atual
      let updatedCicloAtual = [...userCycle.ciclo_atual];
      const currentIndex = updatedCicloAtual.indexOf(subjectId);
      if (currentIndex !== -1) {
        updatedCicloAtual.splice(currentIndex, 1);
        updatedCicloAtual.push(subjectId);
      }

      // Buscar próximas matérias disponíveis no ciclo atual para completar as disciplinas do dia
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

      const subjectsPerDay = userSettings?.subjects_per_day || 3;
      const slotsNeeded = subjectsPerDay - newDisciplinasDoDia.length;

      console.log('🔵 Buscando próximas matérias para completar o dia:', {
        subjectsPerDay,
        currentDailySubjects: newDisciplinasDoDia.length,
        slotsNeeded,
        isOnlyOneSubjectPerDay: subjectsPerDay === 1
      });

      // NOVA LÓGICA: Se há apenas 1 matéria por dia, não buscar próximas automaticamente
      // Deixar o dia vazio para mostrar mensagem de "dia concluído"
      if (slotsNeeded > 0 && subjectsPerDay > 1) {
        // Buscar matérias disponíveis no ciclo atual (que não estão no dia atual)
        const availableSubjectsInCycle = updatedCicloAtual.filter(id => {
          if (id === subjectId) return false; // Excluir a matéria que acabou de ser concluída
          if (newDisciplinasDoDia.includes(id)) return false; // Já está no dia
          
          const cycleSubject = subjects.find(s => s.id === id);
          if (!cycleSubject || cycleSubject.status === 'Concluída') return false;
          if (!cycleSubject.topics || cycleSubject.topics.length === 0) return false;
          
          // Verificar se tem tópicos não revisados
          return cycleSubject.topics.some(topic => (topic.reviewCount || topic.review_count) === 0);
        });

        console.log('🔵 Matérias disponíveis no ciclo para subir:', {
          available: availableSubjectsInCycle.length,
          subjects: availableSubjectsInCycle.map(id => subjects.find(s => s.id === id)?.name),
          cicloAtualAtualizado: updatedCicloAtual.map(id => subjects.find(s => s.id === id)?.name),
          subjectIdConcluido: subjects.find(s => s.id === subjectId)?.name
        });

        // Adicionar as próximas matérias disponíveis às disciplinas do dia
        const nextSubjectsForDay = availableSubjectsInCycle.slice(0, slotsNeeded);
        newDisciplinasDoDia.push(...nextSubjectsForDay);

        console.log('🔵 Próximas matérias adicionadas ao dia:', {
          added: nextSubjectsForDay.map(id => subjects.find(s => s.id === id)?.name),
          newDailyList: newDisciplinasDoDia.map(id => subjects.find(s => s.id === id)?.name)
        });
      }

      console.log('🔵 Atualizando ciclo:', {
        subjectId,
        subject: subject.name,
        topicsMarkedForReview: topicsToReview.length,
        cicloAtual_antes: userCycle.ciclo_atual.length,
        cicloAtual_depois: updatedCicloAtual.length,
        disciplinasDoDia_antes: userCycle.disciplinas_do_dia.length,
        disciplinasDoDia_depois: newDisciplinasDoDia.length,
        action: 'materia_movida_para_final_e_proximas_subiram'
      });
      
      console.log('🔵 Atualizando banco de dados...');
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: updatedCicloAtual,
          disciplinas_do_dia: newDisciplinasDoDia,
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

      // Não precisa mais do refresh final - updateTopic já faz isso
      console.log('✅ Sessão concluída - dados já atualizados pelo updateTopic');
      
      console.log('✅ handleCompleteSession FINALIZADO COM SUCESSO');
      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  return { handleCompleteSession };
};
