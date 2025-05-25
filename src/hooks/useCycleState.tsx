
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CycleState {
  completedSubjects: number;
  totalSubjects: number;
  completedCycles: number;
  showCongratulations: boolean;
  isNewCycle: boolean;
}

export const useCycleState = () => {
  const { user } = useAuth();
  const [cycleState, setCycleState] = useState<CycleState>({
    completedSubjects: 0,
    totalSubjects: 0,
    completedCycles: 0,
    showCongratulations: false,
    isNewCycle: false
  });

  const loadCycleData = async () => {
    if (!user) return;

    try {
      // Buscar dados do ciclo atual
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cycleError && cycleError.code !== 'PGRST116') {
        throw cycleError;
      }

      // Buscar total de matérias do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;

      const totalSubjects = subjectsData?.length || 0;
      const currentCycle = cycleData?.ciclo_atual || [];
      const completedSubjects = currentCycle.length;
      const completedCycles = cycleData?.ciclos_realizados || 0;

      // Verificar se todas as matérias do dia foram estudadas
      const { data: dailySubjects, error: dailyError } = await supabase
        .from('user_cycles')
        .select('disciplinas_do_dia')
        .eq('user_id', user.id)
        .single();

      const dailySubjectsCount = dailySubjects?.disciplinas_do_dia?.length || 0;
      const showCongratulations = dailySubjectsCount > 0 && completedSubjects >= dailySubjectsCount;

      // Determinar se é um novo ciclo (primeira matéria do ciclo)
      const isNewCycle = completedSubjects === 1 && totalSubjects > 0;

      setCycleState({
        completedSubjects,
        totalSubjects,
        completedCycles,
        showCongratulations,
        isNewCycle
      });

    } catch (error) {
      console.error('Erro ao carregar dados do ciclo:', error);
    }
  };

  const updateCycleState = async (newCompletedSubjects: number) => {
    if (!user) return;

    try {
      const { data: currentCycle, error: fetchError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let cyclosRealizados = currentCycle?.ciclos_realizados || 0;
      
      // Se completou todas as matérias, incrementar ciclos realizados
      if (newCompletedSubjects >= cycleState.totalSubjects && cycleState.totalSubjects > 0) {
        cyclosRealizados += 1;
        newCompletedSubjects = 0; // Resetar para o próximo ciclo
      }

      const { error: updateError } = await supabase
        .from('user_cycles')
        .upsert({
          user_id: user.id,
          ciclo_atual: Array(newCompletedSubjects).fill('completed'),
          ciclos_realizados: cyclosRealizados,
          atualizado_em: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // Recarregar dados após atualização
      await loadCycleData();
    } catch (error) {
      console.error('Erro ao atualizar ciclo:', error);
    }
  };

  const resetCycles = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_cycles')
        .upsert({
          user_id: user.id,
          ciclo_atual: [],
          ciclos_realizados: 0,
          disciplinas_do_dia: [],
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        });

      if (error) throw error;

      await loadCycleData();
    } catch (error) {
      console.error('Erro ao resetar ciclos:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadCycleData();
  }, [user]);

  return {
    cycleState,
    loadCycleData,
    updateCycleState,
    resetCycles
  };
};
