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
          
          // Buscar o tópico atual para incrementar o reviewCount corretamente
          const { data: currentTopic } = await supabase
            .from('topics')
            .select('review_count')
            .eq('id', topicId)
            .single();
          
          const currentReviewCount = currentTopic?.review_count || 0;
          const newReviewCount = currentReviewCount + 1;
          
          // Determinar o novo estágio baseado no reviewCount
          let newReviewStage: string;
          let nextReviewDate: Date | null = null;
          let completed = false;
          
          if (newReviewCount <= intervals.length) {
            const intervalDays = intervals[newReviewCount - 1];
            newReviewStage = intervalDays === 1 ? '24h' : `${intervalDays}d`;
            nextReviewDate = new Date();
            nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
          } else {
            newReviewStage = 'Concluído';
            nextReviewDate = null;
            completed = true;
          }
          
          console.log('🔵 Atualizando tópico com dados:', {
            topicId,
            reviewCount: newReviewCount,
            reviewStage: newReviewStage,
            nextReview: nextReviewDate,
            completed: completed
          });
          
          await updateTopic(subjectId, topicId, {
            reviewCount: newReviewCount,
            reviewStage: newReviewStage,
            nextReview: nextReviewDate,
            completed: completed
          });
        }
        console.log('✅ Todos os tópicos atualizados');

        // Se a matéria está como 'Nova' e tem tópicos marcados, atualizar para 'Em Estudo'
        if (subject.status === 'Nova' && topicsToReview.length > 0) {
          console.log('🔵 Atualizando status da matéria de "Nova" para "Em Estudo"');
          await supabase
            .from('subjects')
            .update({
              status: 'Em Estudo',
              updated_at: new Date().toISOString()
            })
            .eq('id', subjectId);
        }

        // VERIFICAR SE TODOS OS TÓPICOS DA MATÉRIA FORAM CONCLUÍDOS
        const { data: allTopics, error: topicsError } = await supabase
          .from('topics')
          .select('id, completed, review_stage, review_count')
          .eq('subject_id', subjectId);
          
        if (topicsError) {
          console.error('❌ Erro ao buscar tópicos:', topicsError);
          throw topicsError;
        }
        
        console.log('🔍 Todos os tópicos da matéria após atualização:', allTopics);

        if (allTopics) {
          const allTopicsCompleted = allTopics.every(t => t.review_stage === 'Concluído' || t.completed === true);
          console.log('🔍 Verificação de conclusão da matéria:', {
            subjectId,
            subjectName: subject.name,
            totalTopics: allTopics.length,
            completedTopics: allTopics.filter(t => t.review_stage === 'Concluído' || t.completed === true).length,
            allTopicsCompleted
          });

          if (allTopicsCompleted) {
            console.log('🏆 MATÉRIA COMPLETAMENTE CONCLUÍDA - Movendo para Concluídas Gerais');
            
            // Marcar matéria como concluída
            await supabase
              .from('subjects')
              .update({ status: 'Concluída' })
              .eq('id', subjectId);

            // Remover do ciclo completamente (não vai para matérias pendentes)
            const newCicloAtual = userCycle.ciclo_atual.filter(id => id !== subjectId);
            const newDisciplinasDodia = userCycle.disciplinas_do_dia.filter(id => id !== subjectId);
            
            const currentIndex = userCycle.indice_atual || 0;
            const subjectIndexInCycle = userCycle.ciclo_atual.indexOf(subjectId);
            let newIndex = currentIndex;
            
            if (subjectIndexInCycle !== -1 && subjectIndexInCycle < currentIndex) {
              newIndex = Math.max(0, currentIndex - 1);
            }

            console.log('🏆 Removendo matéria concluída do ciclo:', {
              subjectName: subject.name,
              cicloAtual_antes: userCycle.ciclo_atual.length,
              cicloAtual_depois: newCicloAtual.length,
              indice_atual_antes: currentIndex,
              indice_atual_depois: newIndex
            });

            const { error: updateError } = await supabase
              .from('user_cycles')
              .update({
                ciclo_atual: newCicloAtual,
                disciplinas_do_dia: newDisciplinasDodia,
                indice_atual: newIndex,
                atualizado_em: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (updateError) throw updateError;

            const freshCycle = await loadUserCycle(user.id);
            if (!freshCycle) {
              throw new Error('Erro ao carregar ciclo atualizado');
            }
            
            setUserCycle(freshCycle);
            setTempMarkedTopics({});
            
            // Verificar se TODAS as matérias estão agora concluídas
            const { data: allUserSubjects, error: allSubjectsError } = await supabase
              .from('subjects')
              .select(`
                id,
                name,
                status,
                topics:topics(id, review_stage, completed)
              `)
              .eq('user_id', user.id);
            
            if (!allSubjectsError && allUserSubjects) {
              const allSubjectsCompleted = allUserSubjects.every(subject => {
                if (!subject.topics || subject.topics.length === 0) return false;
                return subject.topics.every(topic => 
                  topic.review_stage === 'Concluído' || topic.completed === true
                );
              });
              
              if (allSubjectsCompleted) {
                console.log('🎊 TODOS OS ESTUDOS CONCLUÍDOS!');
                
                // Disparar evento especial para estudos concluídos
                window.dispatchEvent(new CustomEvent('allStudiesCompleted'));
                
                toast.success('🎊 Parabéns! Você concluiu todos os estudos! Todas as matérias foram dominadas!');
              } else {
                toast.success('🎉 Matéria completamente concluída! Movida para Concluídas Gerais.');
              }
            } else {
              toast.success('🎉 Matéria completamente concluída! Movida para Concluídas Gerais.');
            }
            
            // Disparar evento para atualizar estatísticas imediatamente
            window.dispatchEvent(new CustomEvent('cycleUpdated'));
            
            return;
          }
        }
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
        
        // Disparar evento para atualizar estatísticas imediatamente
        window.dispatchEvent(new CustomEvent('cycleUpdated'));
        
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

      // Refresh dos dados para garantir que as mudanças sejam refletidas na interface
      console.log('🔵 Fazendo refresh final dos dados...');
      await refreshData();
      
      console.log('✅ Sessão concluída - dados atualizados');
      
      console.log('✅ handleCompleteSession FINALIZADO COM SUCESSO');
      
      // Disparar evento para atualizar estatísticas imediatamente
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      
      toast.success('Sessão concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao concluir sessão:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  return { handleCompleteSession };
};

