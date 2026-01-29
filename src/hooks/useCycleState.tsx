
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
        .limit(1);

      if (error) {
        console.error('Erro ao buscar ciclo do usuário:', error);
        return;
      }

      setUserCycle(data?.[0] || null);
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
        .select();

      if (error) {
        console.error('Erro ao atualizar ciclo:', error);
        return;
      }

      setUserCycle(data?.[0] || null);
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
    if (!user) return;

    try {
      console.log('🔄 Iniciando reset completo do ciclo para usuário:', user.id);

      // 1. Buscar todas as matérias do usuário para resetar as revisões
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) {
        console.error('Erro ao buscar matérias do usuário:', subjectsError);
        throw subjectsError;
      }

      const subjectIds = (userSubjects || []).map(s => s.id);
      console.log('📚 Matérias encontradas para reset:', subjectIds.length);

      // 2. Resetar todas as revisões dos tópicos das matérias do usuário
      if (subjectIds.length > 0) {
        console.log('🔄 Resetando revisões dos tópicos...', { subjectIds });

        try {
          const { data: topicsData, error: topicsResetError } = await supabase
            .from('topics')
            .update({
              review_stage: null,
              review_count: 0,
              next_review: null,
              last_reviewed_at: null,
              completed: false,
              updated_at: new Date().toISOString()
            })
            .in('subject_id', subjectIds)
            .select('id, name, subject_id');

          if (topicsResetError) {
            console.error('❌ Erro ao resetar tópicos:', topicsResetError);
            console.log('🔄 Tentando abordagem alternativa para tópicos...');

            // Tentar resetar tópico por tópico se o batch falhar
            for (const subjectId of subjectIds) {
              const { error: individualError } = await supabase
                .from('topics')
                .update({
                  review_stage: null,
                  review_count: 0,
                  next_review: null,
                  last_reviewed_at: null,
                  completed: false,
                  updated_at: new Date().toISOString()
                })
                .eq('subject_id', subjectId);

              if (individualError) {
                console.error(`❌ Erro ao resetar tópicos da matéria ${subjectId}:`, individualError);
              }
            }
          } else {
            console.log('✅ Revisões dos tópicos resetadas:', { topicsAtualizados: topicsData?.length || 0 });
          }
        } catch (topicsError) {
          console.error('❌ Erro geral ao resetar tópicos:', topicsError);
          // Continuar mesmo se houver erro nos tópicos
        }
      }

      // 3. Resetar status das matérias para "Nova"
      if (subjectIds.length > 0) {
        console.log('🔄 Resetando status das matérias...');

        try {
          const { data: subjectsData, error: subjectsResetError } = await supabase
            .from('subjects')
            .update({
              status: 'Nova',
              completed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .select('id, name, status');

          if (subjectsResetError) {
            console.error('❌ Erro ao resetar matérias:', subjectsResetError);
            throw subjectsResetError;
          }
          console.log('✅ Status das matérias resetado:', { materiasAtualizadas: subjectsData?.length || 0 });
        } catch (subjectsError) {
          console.error('❌ Erro geral ao resetar matérias:', subjectsError);
          throw subjectsError;
        }
      }

      // 4. Verificar se existe um ciclo para o usuário
      const { data: existingCycleData, error: checkError } = await supabase
        .from('user_cycles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) {
        console.error('Erro ao verificar ciclo existente:', checkError);
        throw checkError;
      }

      // 5. Resetar ou criar o ciclo do usuário
      const existingCycle = existingCycleData?.[0] || null;

      if (existingCycle) {
        // Se existe, fazer update
        console.log('📝 Atualizando ciclo existente');
        const { error: updateError } = await supabase
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

        if (updateError) throw updateError;
      } else {
        // Se não existe, criar um novo
        console.log('➕ Criando novo ciclo');
        const { error: insertError } = await supabase
          .from('user_cycles')
          .insert({
            user_id: user.id,
            ciclo_atual: [],
            disciplinas_do_dia: [],
            ciclos_realizados: 0,
            data_inicio_ciclo: new Date().toISOString(),
            data_fim_ciclo: null,
            atualizado_em: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      console.log('✅ Reset completo do ciclo concluído com sucesso');
      await fetchUserCycle();
    } catch (error) {
      console.error('Erro ao resetar ciclo:', error);
      throw error;
    }
  };

  // Check if all subjects for the day are completed
  const isAllDaySubjectsCompleted = () => {
    console.log('Verificando se todas as disciplinas do dia foram concluídas:', {
      disciplinas_do_dia: userCycle?.disciplinas_do_dia,
      ciclo_atual: userCycle?.ciclo_atual,
      hasDisciplinasDodia: userCycle?.disciplinas_do_dia && userCycle.disciplinas_do_dia.length > 0
    });

    // Se não há disciplinas do dia definidas, retorna false
    if (!userCycle?.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0) {
      console.log('Não há disciplinas do dia ou array vazio - retornando false');
      return false;
    }

    // Verifica se todas as disciplinas do dia estão no ciclo atual (concluídas)
    const allCompleted = userCycle.disciplinas_do_dia.every(subjectId =>
      userCycle.ciclo_atual.includes(subjectId)
    );

    console.log('Resultado da verificação - todas concluídas:', allCompleted, {
      disciplinas_do_dia_count: userCycle.disciplinas_do_dia.length,
      disciplinas_concluidas_count: userCycle.disciplinas_do_dia.filter(id => userCycle.ciclo_atual.includes(id)).length
    });

    return allCompleted;
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
    resetCycle,
    isAllDaySubjectsCompleted
  };
};
