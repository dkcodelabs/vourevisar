import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { debounceEvent, getCachedData, setCachedData, devLog, errorLog } from '@/utils/performanceOptimizations';

export interface DailyProgress {
  studiedCount: number;
  dailyGoal: number;
  progressPercentage: number;
  studiedSubjects: string[];
  remainingCount: number;
}

export interface StudySession {
  subjectId: string;
  subjectName: string;
  cyclePosition: number;
  topicsStudied: string[];
  completedAt: string;
}

export const useDailyStudyProgress = () => {
  const { user } = useAuth();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>({
    studiedCount: 0,
    dailyGoal: 2,
    progressPercentage: 0,
    studiedSubjects: [],
    remainingCount: 2
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userCycle, setUserCycle] = useState<any>(null);
  const [resetReason, setResetReason] = useState<'new_cycle' | 'new_day' | 'continue' | null>(null);

  // Carregar progresso diário - SEM useCallback
  const loadDailyProgress = async () => {
    console.log('🔄 useDailyStudyProgress loadDailyProgress CALLED:', { 
      user: !!user, 
      userId: user?.id,
      timestamp: new Date().toISOString() 
    });
    
    if (!user?.id) {
      console.log('❌ No user, setting isLoading false');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Setting isLoading TRUE');
      setIsLoading(true);

      // DETECÇÃO INTELIGENTE: Verificar se precisa resetar automaticamente
      const today = new Date().toISOString().split('T')[0];
      
      // Carregar dados do ciclo atual
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cycleError) {
        console.error('Erro ao carregar ciclo:', cycleError);
        setIsLoading(false);
        return;
      }

      if (cycleData) {
        // DETECÇÃO INTELIGENTE CORRIGIDA: Verificar condições de reset
        const data: any = cycleData; // Temporário para evitar erros de tipagem
        const lastResetDate = data.data_ultimo_reset;
        const isNewDay = !lastResetDate || lastResetDate !== today;
        const currentStudiedCount = data.materias_estudadas_hoje?.length || 0;
        const goalCount = data.materias_por_dia || 2;
        const hadCompletedGoal = currentStudiedCount >= goalCount;
        
        // CORREÇÃO: Melhorar detecção de novo ciclo
        const bankDataIsEmpty = !data.materias_estudadas_hoje || data.materias_estudadas_hoje.length === 0;
        const cycleAge = Date.now() - new Date(data.data_inicio_ciclo).getTime();
        const cycleAgeDays = Math.floor(cycleAge / (24 * 60 * 60 * 1000));
        
        // NOVA LÓGICA CORRIGIDA: Detectar novo ciclo de forma mais precisa
        const isNewCycle = (
          // Caso 1: Ciclo iniciado hoje ou ontem (SEMPRE resetar, independente do progresso)
          (cycleAgeDays <= 1) ||
          // Caso 2: Nunca foi resetado
          (!lastResetDate) ||
          // Caso 3: Ciclo muito antigo sem progresso (backup)
          (cycleAgeDays > 3 && bankDataIsEmpty)
        );
        
        // Log removido para otimização
        
        let shouldReset = false;
        let reason: 'new_cycle' | 'new_day' | 'continue' = 'continue';
        
        if (isNewCycle) {
          shouldReset = true;
          reason = 'new_cycle';
        } else if (isNewDay && hadCompletedGoal) {
          shouldReset = true;
          reason = 'new_day';
        } else if (isNewDay && !hadCompletedGoal) {
          shouldReset = false;
          reason = 'continue';
        } else {
          shouldReset = false;
          reason = 'continue';
        }
        
        if (shouldReset) {
          // Reset automático inteligente
          const { error: resetError } = await supabase
            .from('user_cycles')
            .update({
              materias_estudadas_hoje: [],
              data_ultimo_reset: today,
              atualizado_em: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (resetError) {
            errorLog('Erro ao resetar progresso:', resetError);
          } else {
            data.materias_estudadas_hoje = [];
            data.data_ultimo_reset = today;
          }
        } else if (isNewDay) {
          // Apenas atualizar data sem resetar progresso
          const { error: updateError } = await supabase
            .from('user_cycles')
            .update({
              data_ultimo_reset: today,
              atualizado_em: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Erro ao atualizar data:', updateError);
          } else {
            data.data_ultimo_reset = today;
          }
        }
        
        setResetReason(reason);
        setUserCycle(data);
        
        // CORREÇÃO: Usar dados corretos do banco após reset
        const finalStudiedSubjects = shouldReset ? [] : (data.materias_estudadas_hoje || []);
        const studiedCount = finalStudiedSubjects.length;
        const dailyGoal = data.materias_por_dia || 2;
        const progressPercentage = dailyGoal > 0 ? Math.round((studiedCount / dailyGoal) * 100) : 0;
        const remainingCount = Math.max(0, dailyGoal - studiedCount);

        // Log removido para otimização

        setDailyProgress({
          studiedCount,
          dailyGoal,
          progressPercentage,
          studiedSubjects: finalStudiedSubjects,
          remainingCount
        });
      } else {
        // Se não há ciclo, criar dados padrão
        setDailyProgress({
          studiedCount: 0,
          dailyGoal: 2,
          progressPercentage: 0,
          studiedSubjects: [],
          remainingCount: 2
        });
      }
    } catch (error) {
      console.error('❌ ERRO ao carregar progresso diário:', error);
    } finally {
      console.log('✅ Setting isLoading FALSE in finally');
      setIsLoading(false);
    }
  };

  // Salvar sessão de estudo
  const saveStudySession = useCallback(async (session: StudySession) => {
    if (!user?.id) {
      return false;
    }

    try {
      const now = new Date();
      const hourOfDay = now.getHours();
      const dayOfWeek = now.getDay() || 7; // domingo = 7
      const isWeekend = dayOfWeek >= 6;

      // Preparar dados para inserção
      const sessionData = {
        user_id: user.id,
        subject_id: session.subjectId,
        subject_name: session.subjectName,
        study_date: now.toISOString().split('T')[0],
        cycle_position: session.cyclePosition,
        topics_studied_array: session.topicsStudied,
        topics_count: session.topicsStudied.length,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        is_weekend: isWeekend,
        completed_at: session.completedAt,
        // Campos legados (manter compatibilidade)
        session_date: now.toISOString().split('T')[0],
        topics_studied: session.topicsStudied.length,
        session_duration_minutes: null
      };

      // Log removido para otimização

      // Inserir sessão na tabela study_sessions
      const { error: sessionError } = await supabase
        .from('study_sessions')
        .insert(sessionData);

      if (sessionError) {
        console.error('Erro ao salvar sessão:', sessionError);
        return false;
      }

      // Atualizar progresso diário no user_cycles
      
      // @ts-ignore - Campo existe mas pode estar faltando na definição de tipos
      const { data: currentCycleData, error: fetchError } = await supabase
        .from('user_cycles')
        .select('materias_estudadas_hoje')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar dados atuais do ciclo:', fetchError);
        return false;
      }

      // @ts-ignore - Campo existe mas pode estar faltando na definição de tipos
      const currentStudied = (currentCycleData?.materias_estudadas_hoje as string[]) || [];

      if (!currentStudied.includes(session.subjectId)) {
        const updatedStudied = [...currentStudied, session.subjectId];
        
        const { error: updateError } = await supabase
          .from('user_cycles')
          .update({
            materias_estudadas_hoje: updatedStudied,
            atualizado_em: now.toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Erro ao atualizar progresso:', updateError);
          return false;
        }

        // CORREÇÃO: Atualizar resetReason para 'continue' após primeira sessão
        if (currentStudied.length === 0) {
          setResetReason('continue');
        }
      }

      // Disparar eventos para outros componentes
      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { subjectId: session.subjectId, subjectName: session.subjectName }
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar sessão de estudo:', error);
      return false;
    }
  }, [user]);

  // Obter próxima matéria sugerida
  const getNextSuggestedSubject = useCallback(() => {
    const data: any = userCycle;
    if (!data?.ciclo_atual || !Array.isArray(data.ciclo_atual)) {
      return null;
    }

    const studiedToday = data.materias_estudadas_hoje || [];
    
    // Encontrar primeira matéria não estudada hoje
    for (let i = 0; i < data.ciclo_atual.length; i++) {
      const subjectId = data.ciclo_atual[i];
      if (!studiedToday.includes(subjectId)) {
        return {
          subjectId,
          position: i + 1,
          isNext: true
        };
      }
    }

    // Se todas foram estudadas, sugerir primeira do ciclo
    return {
      subjectId: data.ciclo_atual[0],
      position: 1,
      isNext: false
    };
  }, []);

  // Verificar se matéria foi estudada hoje
  const isSubjectStudiedToday = useCallback((subjectId: string) => {
    const data: any = userCycle;
    const studiedToday = data?.materias_estudadas_hoje || [];
    return studiedToday.includes(subjectId);
  }, []);

  // Obter horário de conclusão de uma matéria
  const getSubjectCompletionTime = useCallback(async (subjectId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // @ts-ignore - Tipo inferido muito complexo, mas funciona corretamente
      const { data, error } = await supabase
        .from('study_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
        .eq('study_date', new Date().toISOString().split('T')[0])
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return new Date((data as any).completed_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao buscar horário de conclusão:', error);
      return null;
    }
  }, [user]);

  // Resetar progresso diário (para testes) - SEM useCallback
  const resetDailyProgress = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_hoje: [],
          data_ultimo_reset: new Date().toISOString().split('T')[0],
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao resetar progresso:', error);
        return false;
      }

      await loadDailyProgress();
      toast.success('Progresso diário resetado!');
      return true;
    } catch (error) {
      console.error('Erro ao resetar progresso diário:', error);
      return false;
    }
  };

  // Carregar dados quando o componente monta - SEM DEPENDÊNCIAS
  useEffect(() => {
    if (user) {
      loadDailyProgress();
    }
  }, [user?.id]); // Apenas user.id

  // Função para forçar refresh dos dados - SEM useCallback
  const forceRefresh = async () => {
    console.log('🔄 Forçando refresh dos dados do progresso diário...');
    setIsLoading(true);
    await loadDailyProgress();
  };

  // Sistema de debounce para eventos
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Escutar eventos de atualização (super otimizado)
  useEffect(() => {
    const handleProgressUpdate = () => {
      debounceEvent('dailyProgress', () => loadDailyProgress(), 300);
    };

    const handleCycleUpdate = () => {
      debounceEvent('cycleUpdate', () => loadDailyProgress(), 500);
    };

    window.addEventListener('dailyProgressUpdated', handleProgressUpdate);
    window.addEventListener('cycleUpdated', handleCycleUpdate);
    
    return () => {
      window.removeEventListener('dailyProgressUpdated', handleProgressUpdate);
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
    };
  }, [loadDailyProgress]);

  return {
    dailyProgress,
    userCycle,
    isLoading,
    resetReason,
    saveStudySession,
    getNextSuggestedSubject,
    isSubjectStudiedToday,
    getSubjectCompletionTime,
    resetDailyProgress,
    refreshProgress: loadDailyProgress,
    forceRefresh
  };
};