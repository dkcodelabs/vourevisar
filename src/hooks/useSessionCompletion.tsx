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

      // Se não houver tópicos marcados para revisão, pular matéria (adiar para o final do ciclo)
      if (topicsToReview.length === 0) {
        console.log('🔵 PULANDO MATÉRIA - Iniciando lógica de pulo...');
        
        const { data: settings } = await supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', user.id)
          .single();
        const subjectsPerDay = settings?.subjects_per_day || 2;

        // 1. Remover matéria pulada das disciplinas do dia
        let newDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
        
        // 2. Mover matéria pulada para o final do ciclo atual
        let updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
        updatedCicloAtual.push(subjectId);

        // 3. Preencher disciplinas do dia com matérias do ciclo atual
        while (newDisciplinasDoDia.length < subjectsPerDay && updatedCicloAtual.length > 0) {
          const nextId = updatedCicloAtual.shift();
          if (nextId && !newDisciplinasDoDia.includes(nextId)) {
            newDisciplinasDoDia.push(nextId);
          }
        }

        // 4. Se ainda não preencheu o limite, buscar matérias disponíveis fora do ciclo
        if (newDisciplinasDoDia.length < subjectsPerDay) {
          console.log('🔵 Reabastecendo ciclo com matérias disponíveis...');
          
          const availableSubjectsOutsideCycle = subjects.filter(subject => {
            if (subject.status === 'Concluída') return false;
            if (!subject.topics || subject.topics.length === 0) return false;
            if (updatedCicloAtual.includes(subject.id)) return false; // Já está no ciclo
            if (newDisciplinasDoDia.includes(subject.id)) return false; // Já está no dia
            return subject.topics.some(topic => (topic.reviewCount || topic.review_count) === 0);
          });

          // Adicionar matérias disponíveis ao ciclo atual
          for (const subject of availableSubjectsOutsideCycle) {
            if (updatedCicloAtual.length >= subjects.length) break; // Evitar loop infinito
            if (!updatedCicloAtual.includes(subject.id)) {
              updatedCicloAtual.push(subject.id);
            }
          }

          // Tentar preencher novamente as disciplinas do dia
          while (newDisciplinasDoDia.length < subjectsPerDay && updatedCicloAtual.length > 0) {
            const nextId = updatedCicloAtual.shift();
            if (nextId && !newDisciplinasDoDia.includes(nextId)) {
              newDisciplinasDoDia.push(nextId);
            }
          }
        }

        console.log('🔵 Atualizando ciclo após pular matéria:', {
          subjectId,
          subjectName: subject.name,
          subjectsPerDay,
          newDisciplinasDoDia,
          updatedCicloAtual
        });

        // 5. Atualizar banco de dados
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

        // 6. CRÍTICO: Recarregar o ciclo atualizado no frontend
        console.log('🔵 Recarregando ciclo atualizado...');
        const freshCycle = await loadUserCycle(user.id);
        if (!freshCycle) {
          throw new Error('Erro ao carregar ciclo atualizado');
        }
        
        console.log('🔵 Ciclo recarregado:', freshCycle);
        setUserCycle(freshCycle);
        
        // 7. Limpar tópicos marcados e mostrar feedback
        setTempMarkedTopics({});
        toast.success('Matéria pulada com sucesso!');
        
        console.log('✅ Matéria pulada com sucesso');
        return;
      }

      console.log('🔵 Atualizando ciclo:', {
        subjectId,
        subject: subject.name,
        topicsMarkedForReview: topicsToReview.length,
        cicloAtual_antes: userCycle.ciclo_atual.length,
        cicloAtual_depois: updatedCicloAtual.length,
        disciplinasDoDia_antes: userCycle.disciplinas_do_dia.length,
        disciplinasDoDia_depois: newDisciplinasDoDia.length,
        materiasPendentes_antes: (userCycle.materias_pendentes || []).length,
        materiasPendentes_depois: updatedMateriasPendentes.length,
        action: 'materia_movida_para_final_e_proximas_subiram'
      });
      
      console.log('🔵 Atualizando banco de dados...');
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: updatedCicloAtual,
          disciplinas_do_dia: newDisciplinasDoDia,
          materias_pendentes: updatedMateriasPendentes,
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

