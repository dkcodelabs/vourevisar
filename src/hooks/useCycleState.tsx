
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
}

export const useCycleState = () => {
  const { user } = useAuth();
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserCycle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar ciclo do usuário:', error);
        return;
      }

      setUserCycle(data);
    } catch (error) {
      console.error('Erro ao buscar ciclo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserCycle = async (updates: Partial<UserCycle>) => {
    if (!user || !userCycle) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .update({
          ...updates,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar ciclo:', error);
        return;
      }

      setUserCycle(data);
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
          ciclo_atual: [],
          disciplinas_do_dia: initialDisciplinas,
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

      setUserCycle(data);
    } catch (error) {
      console.error('Erro ao criar ciclo inicial:', error);
    }
  };

  const resetCycle = async () => {
    if (!user || !userCycle) return;

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: [],
          disciplinas_do_dia: [],
          ciclos_realizados: 0,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserCycle();
    } catch (error) {
      console.error('Erro ao resetar ciclo:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserCycle();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return {
    userCycle,
    isLoading,
    fetchUserCycle,
    updateUserCycle,
    createInitialUserCycle,
    resetCycle
  };
};
