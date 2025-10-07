import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCycleViewManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const addSubjectView = async (subjectId: string, subjectName: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Buscar ciclo atual
      let { data: userCycle, error: fetchError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Se não existe ciclo, criar um novo
      if (!userCycle) {
        console.log('Nenhum ciclo encontrado, criando novo ciclo...');
        
        // Buscar todas as matérias ativas do usuário
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', user.id)
          .neq('status', 'Concluída')
          .order('priority', { ascending: true });

        if (subjectsError) throw subjectsError;

        const cicloAtual = subjects?.map(s => s.id) || [];
        
        // Criar novo ciclo
        const { data: newCycle, error: createError } = await supabase
          .from('user_cycles')
          .insert({
            user_id: user.id,
            ciclo_atual: cicloAtual,
            disciplinas_do_dia: [],
            indice_atual: 0,
            ciclos_realizados: 0,
            data_inicio_ciclo: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        
        userCycle = newCycle;
        toast.success('Novo ciclo criado automaticamente');
      }

      // Adicionar o subject_id novamente ao ciclo_atual
      const updatedCicloAtual = [...(userCycle.ciclo_atual || []), subjectId];

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: updatedCicloAtual,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success(`Visualização de "${subjectName}" adicionada ao ciclo`);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar visualização:', error);
      toast.error('Erro ao adicionar visualização');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeSubjectView = async (subjectId: string, viewIndex: number, subjectName: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Buscar ciclo atual
      const { data: userCycle, error: fetchError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!userCycle) {
        toast.error('Nenhum ciclo ativo encontrado');
        return false;
      }

      // Encontrar e remover a visualização específica
      const cicloAtual = [...(userCycle.ciclo_atual || [])];
      let foundCount = 0;
      let indexToRemove = -1;

      for (let i = 0; i < cicloAtual.length; i++) {
        if (cicloAtual[i] === subjectId) {
          if (foundCount === viewIndex) {
            indexToRemove = i;
            break;
          }
          foundCount++;
        }
      }

      if (indexToRemove === -1) {
        toast.error('Visualização não encontrada');
        return;
      }

      // Remover a visualização
      cicloAtual.splice(indexToRemove, 1);

      // Verificar se todas as ocorrências foram removidas
      const remainingCount = cicloAtual.filter(id => id === subjectId).length;
      
      if (remainingCount === 0) {
        toast.warning(`Última visualização de "${subjectName}" removida do ciclo`);
      }

      // Ajustar disciplinas_do_dia se necessário
      let disciplinasoDia = [...(userCycle.disciplinas_do_dia || [])];
      let indicAtual = userCycle.indice_atual || 0;

      // Se a visualização estava nas disciplinas do dia, remover
      if (disciplinasoDia.includes(subjectId)) {
        // Verificar se ainda há outra visualização da mesma matéria no ciclo
        if (remainingCount === 0) {
          disciplinasoDia = disciplinasoDia.filter(id => id !== subjectId);
        }
      }

      // Ajustar índice atual se necessário
      if (indexToRemove < indicAtual) {
        indicAtual = Math.max(0, indicAtual - 1);
      } else if (indexToRemove === indicAtual && cicloAtual.length > 0) {
        indicAtual = indicAtual % cicloAtual.length;
      }

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: cicloAtual,
          disciplinas_do_dia: disciplinasoDia,
          indice_atual: indicAtual,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success(`Visualização de "${subjectName}" removida do ciclo`);
      return true;
    } catch (error) {
      console.error('Erro ao remover visualização:', error);
      toast.error('Erro ao remover visualização');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectViewCount = (subjectId: string, cicloAtual: string[]): number => {
    if (!cicloAtual) return 0;
    return cicloAtual.filter(id => id === subjectId).length;
  };

  const getViewNumber = (subjectId: string, cycleIndex: number, cicloAtual: string[]): number => {
    if (!cicloAtual) return 1;
    
    let viewNumber = 1;
    for (let i = 0; i < cycleIndex && i < cicloAtual.length; i++) {
      if (cicloAtual[i] === subjectId) {
        viewNumber++;
      }
    }
    return viewNumber;
  };

  return {
    addSubjectView,
    removeSubjectView,
    getSubjectViewCount,
    getViewNumber,
    isLoading
  };
};
