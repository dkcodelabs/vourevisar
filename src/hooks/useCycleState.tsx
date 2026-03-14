
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserCycle } from '@/types';

export const useCycleState = () => {
  const { user } = useAuth();
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserCycle = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('Erro ao buscar ciclo do usuário:', error);
        return;
      }

      if (data && data.length > 0) {
        setUserCycle(data[0] as UserCycle);
      } else {
        setUserCycle(null);
      }
    } catch (error) {
      console.error('Erro ao buscar ciclo:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateUserCycle = async (updates: Partial<UserCycle>) => {
    if (!user || !userCycle) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .update({
          ...updates,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', userCycle.id)
        .select();

      if (error) {
        console.error('Erro ao atualizar ciclo:', error);
        return;
      }

      if (data) {
        setUserCycle(data[0] as UserCycle);
      }
    } catch (error) {
      console.error('Erro ao atualizar ciclo:', error);
    }
  };

  const createInitialUserCycle = async (subjectsPerDay: number, currentSubjects: any[]) => {
    if (!user) return;

    try {
      const initialDisciplinas = currentSubjects.slice(0, subjectsPerDay).map(s => s.id);

      const { data, error } = await supabase
        .from('user_cycles')
        .insert([{
          user_id: user.id,
          name: 'Ciclo Inicial',
          status: 'active',
          ciclo_atual: [],
          disciplinas_do_dia: initialDisciplinas,
          materias_pendentes: [],
          ciclos_realizados: 0,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar ciclo inicial:', error);
        return;
      }

      if (data) {
        setUserCycle(data as UserCycle);
      }
    } catch (error) {
      console.error('Erro ao criar ciclo inicial:', error);
    }
  };

  const resetCycle = async (newName?: string) => {
    if (!user) return;

    try {
      console.log('🔄 Iniciando reset do ciclo para usuário:', user.id);

      // 1. Buscar todas as matérias do usuário
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;
      const subjectIds = (userSubjects || []).map(s => s.id);

      // 2. Resetar tópicos (Impedir deleção de histórico)
      if (subjectIds.length > 0) {
        const { error: topicsResetError } = await supabase
          .from('topics')
          .update({
            review_stage: null,
            review_count: 0,
            next_review: null,
            last_reviewed_at: null,
            completed: false,
            memory_stability: null,
            current_interval: null,
            updated_at: new Date().toISOString()
          })
          .in('subject_id', subjectIds);

        if (topicsResetError) console.error('Erro ao resetar tópicos:', topicsResetError);
        
        // 3. Resetar status das matérias
        await supabase
          .from('subjects')
          .update({
            status: 'Nova',
            completed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }

      // 4. Arquivar ciclo atual
      if (userCycle) {
        await supabase
          .from('user_cycles')
          .update({
            status: 'completed',
            data_fim_ciclo: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          })
          .eq('id', userCycle.id);
      }

      // 5. Criar novo ciclo
      const { error: insertError } = await supabase
        .from('user_cycles')
        .insert({
          user_id: user.id,
          name: newName || (userCycle?.name ? `${userCycle.name} (Novo)` : 'Novo Ciclo'),
          status: 'active',
          ciclo_atual: [],
          disciplinas_do_dia: [],
          materias_pendentes: [],
          ciclos_realizados: 0,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        });

      if (insertError) throw insertError;

      console.log('✅ Reset completo concluído');
      await fetchUserCycle();
    } catch (error) {
      console.error('Erro ao resetar ciclo:', error);
      throw error;
    }
  };

  // Check if all subjects for the day are completed
  const isAllDaySubjectsCompleted = () => {
    if (!userCycle?.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0) {
      return false;
    }

    // Verifica se todas as disciplinas do dia estão no ciclo atual (concluídas)
    const allCompleted = userCycle.disciplinas_do_dia.every(subjectId =>
      userCycle.ciclo_atual.includes(subjectId)
    );

    return allCompleted;
  };

  useEffect(() => {
    if (user) {
      fetchUserCycle();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchUserCycle]);

  return {
    userCycle,
    isLoading,
    fetchUserCycle,
    updateUserCycle,
    createInitialUserCycle,
    resetCycle,
    isAllDaySubjectsCompleted
  };
};
