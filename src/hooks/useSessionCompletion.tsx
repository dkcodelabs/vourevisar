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

      // Se não houver tópicos marcados para revisão, pular matéria
      if (topicsToReview.length === 0) {
        console.log('🔵 PULANDO MATÉRIA - Lógica corrigida...');
        
        // PULAR MATÉRIA: manter no ciclo, incrementar índice, remover do dia
        const newDisciplinasDodia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
        const currentIndex = userCycle.indice_atual || 0;
        
        // CORREÇÃO: Encontrar posição da matéria no ciclo e calcular próximo índice corretamente
        const subjectIndexInCycle = userCycle.ciclo_atual.indexOf(subjectId);
        const newIndex = subjectIndexInCycle !== -1 ? subjectIndexInCycle + 1 : currentIndex + 1;

        console.log('🔵 PULAR MATÉRIA - Lógica corrigida:', {
          subjectId,
          subjectName: subject.name,
          subjectIndexInCycle,
          disciplinas_do_dia_antes: userCycle.disciplinas_do_dia.length,
          disciplinas_do_dia_depois: newDisciplinasDodia.length,
          indice_atual_antes: currentIndex,
          indice_atual_depois: newIndex,
          ciclo_atual: userCycle.ciclo_atual.length
        });

        console.log('📍 Matéria pulada - mantendo no ciclo e removendo do dia:', {
          indice_atual: newIndex,
          materia_pulada: subject.name,
          acao: 'manter_indice_mover_para_final_do_ciclo'
        });

        const { error: updateError } = await supabase
          .from('user_cycles')
          .update({
            disciplinas_do_dia: newDisciplinasDodia,
            indice_atual: newIndex,
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar ciclo:', updateError);
          throw updateError;
        }

        console.log('🔵 Recarregando ciclo atualizado...');
        const freshCycle = await loadUserCycle(user.id);
        if (!freshCycle) {
          throw new Error('Erro ao carregar ciclo atualizado');
        }
        
        console.log('🔵 Ciclo recarregado após pular:', {
          disciplinas_do_dia: freshCycle.disciplinas_do_dia,
          ciclo_atual: freshCycle.ciclo_atual
        });
        setUserCycle(freshCycle);
        
        setTempMarkedTopics({});
        toast.success('Matéria pulada! Ela será estudada em outro dia.');
        
        console.log('✅ Matéria pulada com sucesso - removida do dia atual');
        return;
      }

      console.log('🔵 Sessão concluída - movendo matéria para próximo ciclo');
      
      // CONCLUIR SESSÃO: remover do ciclo atual e do dia, adicionar a pendentes
      const newCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
      const newDisciplinasDodia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      
      // Adicionar à lista de matérias pendentes para próximo ciclo
      const materiasPendentes = userCycle.materias_pendentes || [];
      const newMateriasPendentes = materiasPendentes.includes(subjectId) 
        ? materiasPendentes 
        : [...materiasPendentes, subjectId];

      // CORREÇÃO: Ajustar índice quando matéria é removida do ciclo
      const currentIndex = userCycle.indice_atual || 0;
      const subjectIndexInCycle = userCycle.ciclo_atual.indexOf(subjectId);
      let newIndex = currentIndex;
      
      // Se a matéria removida estava antes ou na posição do índice atual, não precisa ajustar
      // Se estava depois, o índice se mantém (próxima matéria assume a posição)
      if (subjectIndexInCycle !== -1 && subjectIndexInCycle < currentIndex) {
        newIndex = Math.max(0, currentIndex - 1);
      }

      console.log('🔵 CONCLUIR SESSÃO - Atualizando ciclo:', {
        subjectId,
        subject: subject.name,
        topicsMarkedForReview: topicsToReview.length,
        cicloAtual_antes: userCycle.ciclo_atual.length,
        cicloAtual_depois: newCicloAtual.length,
        materiasPendentes_antes: materiasPendentes.length,
        materiasPendentes_depois: newMateriasPendentes.length,
        indice_atual_antes: currentIndex,
        indice_atual_depois: newIndex,
        subjectIndexInCycle,
        acao: 'mover_para_materias_pendentes'
      });
      
      console.log('🔵 Atualizando banco de dados...');
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: newCicloAtual,
          disciplinas_do_dia: newDisciplinasDodia,
          materias_pendentes: newMateriasPendentes,
          indice_atual: newIndex,
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

