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
        
        // CORREÇÃO: Quando pular matéria, ela deve sair das disciplinas_do_dia
        // e ir para o final do ciclo, mas NÃO deve ser recolocada no dia atual
        
        // 1. Remover matéria pulada das disciplinas do dia (ela sai definitivamente do dia)
        const newDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
        
        // 2. Mover matéria pulada para o final do ciclo atual (para ser estudada em outro dia)
        let updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
        updatedCicloAtual.push(subjectId);

        console.log('🔵 PULAR MATÉRIA - Lógica corrigida:', {
          subjectId,
          subjectName: subject.name,
          disciplinas_do_dia_antes: userCycle.disciplinas_do_dia.length,
          disciplinas_do_dia_depois: newDisciplinasDoDia.length,
          ciclo_atual_antes: userCycle.ciclo_atual.length,
          ciclo_atual_depois: updatedCicloAtual.length,
          acao: 'materia_removida_do_dia_e_movida_para_final_do_ciclo'
        });

        // 3. CORREÇÃO: Não avançar o índice quando pular - manter a matéria no ciclo
        // A matéria vai para o final do ciclo e o índice permanece o mesmo
        
        console.log('📍 Matéria pulada - mantendo no ciclo e removendo do dia:', {
          indice_atual: userCycle.indice_atual,
          materia_pulada: subject.name,
          acao: 'manter_indice_mover_para_final_do_ciclo'
        });

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

        // 4. Recarregar o ciclo atualizado no frontend
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
        
        // 5. Limpar tópicos marcados e mostrar feedback
        setTempMarkedTopics({});
        toast.success('Matéria pulada! Ela será estudada em outro dia.');
        
        console.log('✅ Matéria pulada com sucesso - removida do dia atual');
        return;
      }

      console.log('🔵 Sessão concluída - movendo matéria para próximo ciclo');
      
      // CORREÇÃO: Quando concluir sessão, mover para materias_pendentes (próximo ciclo)
      
      // 1. Remover a matéria concluída das disciplinas do dia
      const newDisciplinasDoDia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
      
      // 2. Remover do ciclo atual
      let updatedCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
      
      // 3. Adicionar às matérias pendentes (próximo ciclo)
      let updatedMateriasPendentes = userCycle.materias_pendentes || [];
      if (!updatedMateriasPendentes.includes(subjectId)) {
        updatedMateriasPendentes.push(subjectId);
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

