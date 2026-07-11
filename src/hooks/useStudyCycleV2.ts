import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Tables } from '@/integrations/supabase/types';
import { toastGate } from '@/lib/errors/toastGate';

export type StudyCycleV2 = Tables<'study_cycles_v2'>;
export type CycleRotation = Tables<'cycle_rotations'>;
export type CycleSubjectState = Tables<'cycle_subject_states'>;

export const useStudyCycleV2 = () => {
  const [activeCycle, setActiveCycle] = useState<StudyCycleV2 | null>(null);
  const [activeRotation, setActiveRotation] = useState<CycleRotation | null>(null);
  const [subjectStates, setSubjectStates] = useState<CycleSubjectState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActiveCycleData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // 1. Busca o ciclo ativo
      const { data: cycleData, error: cycleError } = await supabase
        .from('study_cycles_v2')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError) throw cycleError;

      if (!cycleData) {
        setActiveCycle(null);
        setActiveRotation(null);
        setSubjectStates([]);
        return;
      }

      setActiveCycle(cycleData);

      // 2. Busca o giro (rotation) ativo
      const { data: rotationData, error: rotationError } = await supabase
        .from('cycle_rotations')
        .select('*')
        .eq('cycle_id', cycleData.id)
        .is('completed_at', null)
        .order('rotation_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rotationError) throw rotationError;
      setActiveRotation(rotationData || null);

      // 3. Busca o estado das matérias
      const { data: statesData, error: statesError } = await supabase
        .from('cycle_subject_states')
        .select('*')
        .eq('cycle_id', cycleData.id);

      if (statesError) throw statesError;
      setSubjectStates(statesData || []);

    } catch (error) {
      console.error('Erro ao buscar dados do ciclo:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeCycle = async (subjectIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Usuário não autenticado');

      // 1. Cria o ciclo
      const { data: newCycle, error: cycleError } = await supabase
        .from('study_cycles_v2')
        .insert({ user_id: session.user.id, status: 'active' })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // 2. Cria a primeira rotação (giro)
      const { data: newRotation, error: rotationError } = await supabase
        .from('cycle_rotations')
        .insert({ cycle_id: newCycle.id, rotation_number: 1 })
        .select()
        .single();

      if (rotationError) throw rotationError;

      // 3. Inicializa os estados das matérias
      if (subjectIds.length > 0) {
        const statesToInsert = subjectIds.map(id => ({
          user_id: session.user.id,
          cycle_id: newCycle.id,
          subject_id: id,
          completed_in_current_rotation: false
        }));

        const { error: statesError } = await supabase
          .from('cycle_subject_states')
          .insert(statesToInsert);

        if (statesError) throw statesError;
      }

      toast.success('Novo ciclo iniciado com sucesso!');
      await fetchActiveCycleData();
    } catch (error) {
      console.error('Erro ao iniciar ciclo:', error);
      toastGate.notifyError('Não foi possível iniciar o ciclo de estudos.', 'HOOKS-USESTUDYCYCLEV2-01', { severity: 'medium' });
    }
  };

  const markSubjectAsStudied = async (subjectId: string) => {
    if (!activeCycle || !activeRotation) {
      toastGate.notifyError('Nenhum ciclo ou giro ativo encontrado.', 'HOOKS-USESTUDYCYCLEV2-02', { severity: 'medium' });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const today = new Date().toISOString().split('T')[0];

      // 1. Loga o estudo na tabela de extrato
      const { error: logError } = await supabase
        .from('cycle_study_logs')
        .insert({
          user_id: session.user.id,
          rotation_id: activeRotation.id,
          subject_id: subjectId,
        });

      if (logError) throw logError;

      // 2. Atualiza o estado da matéria
      const { error: stateError } = await supabase
        .from('cycle_subject_states')
        .upsert({
          user_id: session.user.id,
          cycle_id: activeCycle.id,
          subject_id: subjectId,
          last_studied_date: today,
          completed_in_current_rotation: true
        }, { onConflict: 'cycle_id, subject_id' });

      if (stateError) throw stateError;

      // Atualiza o estado local para UX otimizada
      setSubjectStates(prev => prev.map(s => 
        s.subject_id === subjectId 
          ? { ...s, last_studied_date: today, completed_in_current_rotation: true } 
          : s
      ));

      toast.success('Matéria marcada como estudada!');
    } catch (error) {
      console.error('Erro ao marcar matéria como estudada:', error);
      toastGate.notifyError('Erro ao registrar progresso.', 'HOOKS-USESTUDYCYCLEV2-03', { severity: 'medium' });
    }
  };

  const finishCurrentRotation = async () => {
    if (!activeCycle || !activeRotation) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // 1. Finaliza a rotação atual
      const { error: updateError } = await supabase
        .from('cycle_rotations')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', activeRotation.id);

      if (updateError) throw updateError;

      // 2. Cria uma nova rotação
      const { error: insertError } = await supabase
        .from('cycle_rotations')
        .insert({
          cycle_id: activeCycle.id,
          rotation_number: activeRotation.rotation_number + 1
        });

      if (insertError) throw insertError;

      // 3. Reseta o status 'completed_in_current_rotation' para todas as matérias deste ciclo
      const { error: resetError } = await supabase
        .from('cycle_subject_states')
        .update({ completed_in_current_rotation: false })
        .eq('cycle_id', activeCycle.id);

      if (resetError) throw resetError;

      toast.success(`Giro ${activeRotation.rotation_number} finalizado! Novo giro iniciado.`);
      await fetchActiveCycleData();
    } catch (error) {
      console.error('Erro ao finalizar giro:', error);
      toastGate.notifyError('Erro ao reiniciar o giro.', 'HOOKS-USESTUDYCYCLEV2-04', { severity: 'medium' });
    }
  };

  return {
    activeCycle,
    activeRotation,
    subjectStates,
    isLoading,
    fetchActiveCycleData,
    initializeCycle,
    markSubjectAsStudied,
    finishCurrentRotation
  };
};
