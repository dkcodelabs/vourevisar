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
        console.log('🔵 PULANDO MATÉRIA - Movendo para o final do ciclo...');
        
        // LÓGICA CORRETA: Remover do dia E mover para o final do ciclo
        const newDisciplinasDodia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
        
        // Mover matéria para o FINAL do ciclo
        const newCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
        newCicloAtual.push(subjectId); // Adicionar no final
        
        // CORREÇÃO CRÍTICA: Não alterar o índice quando pular matéria
        // O índice deve permanecer o mesmo para que a próxima seleção continue de onde parou
        const currentIndex = userCycle.indice_atual || 0;
        
        console.log('🔵 PULAR MATÉRIA - Movendo para o final do ciclo:', {
          subjectId,
          subjectName: subject.name,
          disciplinas_do_dia_antes: userCycle.disciplinas_do_dia.length,
          disciplinas_do_dia_depois: newDisciplinasDodia.length,
          indice_atual_mantido: currentIndex,
          ciclo_original: userCycle.ciclo_atual.map(id => {
            const s = subjects.find(sub => sub.id === id);
            return s?.name || 'NOT_FOUND';
          }),
          ciclo_novo: newCicloAtual.map(id => {
            const s = subjects.find(sub => sub.id === id);
            return s?.name || 'NOT_FOUND';
          }),
          acao: 'MOVER_PARA_FINAL_DO_CICLO_MANTER_INDICE'
        });

        console.log('📍 Matéria pulada - movida para o FINAL do ciclo:', {
          materia_pulada: subject.name,
          nova_posicao: 'ULTIMA_DO_CICLO',
          indice_mantido: currentIndex
        });

        const { error: updateError } = await supabase
          .from('user_cycles')
          .update({
            disciplinas_do_dia: newDisciplinasDodia,
            ciclo_atual: newCicloAtual, // Atualizar o ciclo com a matéria no final
            indice_atual: currentIndex, // MANTER o índice atual
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
          ciclo_atual: freshCycle.ciclo_atual,
          indice_atual: freshCycle.indice_atual
        });
        setUserCycle(freshCycle);
        
        setTempMarkedTopics({});
        toast.success('Matéria pulada! Ela será estudada em outro dia.');
        
        console.log('✅ PULAR MATÉRIA - Sucesso:', {
          materia: subject.name,
          resultado: 'materia_permanece_no_ciclo_para_proximo_dia',
          disciplinas_do_dia_atualizadas: freshCycle.disciplinas_do_dia.length,
          ciclo_atual_inalterado: freshCycle.ciclo_atual.length,
          indice_atual_mantido: freshCycle.indice_atual
        });
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

      // LÓGICA CORRIGIDA: Ajustar índice quando matéria é removida do ciclo
      const currentIndex = userCycle.indice_atual || 0;
      const subjectIndexInCycle = userCycle.ciclo_atual.indexOf(subjectId);
      let newIndex = currentIndex;
      
      console.log('🔧 Calculando novo índice após remoção:', {
        currentIndex,
        subjectIndexInCycle,
        cicloAtual_length_antes: userCycle.ciclo_atual.length,
        cicloAtual_length_depois: newCicloAtual.length
      });
      
      // Se a matéria removida estava antes do índice atual, decrementar o índice
      if (subjectIndexInCycle !== -1 && subjectIndexInCycle < currentIndex) {
        newIndex = Math.max(0, currentIndex - 1);
        console.log('📉 Matéria removida antes do índice atual, decrementando:', newIndex);
      }
      // Se a matéria removida estava na posição do índice atual, manter o índice
      // (a próxima matéria assumirá essa posição)
      else if (subjectIndexInCycle === currentIndex) {
        newIndex = currentIndex;
        console.log('🎯 Matéria removida na posição atual, mantendo índice:', newIndex);
      }
      
      // Garantir que o índice seja válido para o novo tamanho do ciclo
      if (newCicloAtual.length === 0) {
        newIndex = 0;
      } else {
        newIndex = Math.min(newIndex, newCicloAtual.length - 1);
      }
      
      console.log('✅ Índice final calculado:', {
        indice_final: newIndex,
        ciclo_novo_length: newCicloAtual.length,
        valido: newIndex >= 0 && newIndex < Math.max(1, newCicloAtual.length)
      });

      console.log('🔵 CONCLUIR SESSÃO - Lógica CORRIGIDA:', {
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
        acao: 'CONCLUIR - remover do ciclo, adicionar a pendentes, ajustar índice'
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
      console.log('✅ CONCLUIR SESSÃO - Sucesso:', {
        materia: subject.name,
        topicos_revisados: topicsToReview.length,
        resultado: 'materia_removida_do_ciclo_adicionada_a_pendentes',
        ciclo_atual_novo_tamanho: freshCycle.ciclo_atual.length,
        materias_pendentes_novo_tamanho: freshCycle.materias_pendentes?.length || 0,
        indice_atual_ajustado: freshCycle.indice_atual
      });
      
      console.log('✅ handleCompleteSession FINALIZADO COM SUCESSO');
      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  return { handleCompleteSession };
};

