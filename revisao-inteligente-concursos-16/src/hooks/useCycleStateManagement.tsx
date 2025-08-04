
import { useState, useEffect } from 'react';
import { UserCycle } from '@/types';

export const useCycleStateManagement = () => {
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isCycleCompleted, setIsCycleCompleted] = useState(false);

  useEffect(() => {
    if (!userCycle) return;
    
    // Ciclo está completo se:
    // 1. Não há matérias no ciclo atual E disciplinas do dia estão vazias
    // 2. OU se há data_fim_ciclo definida
    const cycleCompleted = (
      userCycle.ciclo_atual.length === 0 && 
      userCycle.disciplinas_do_dia.length === 0
    ) || Boolean(userCycle.data_fim_ciclo);
    
    console.log('🔄 useCycleStateManagement - Verificando se ciclo está completo:', {
      ciclo_atual_length: userCycle.ciclo_atual.length,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia.length,
      data_fim_ciclo: userCycle.data_fim_ciclo,
      cycleCompleted
    });
    
    setIsCycleCompleted(cycleCompleted);
  }, [userCycle]);

  return {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    setIsCycleCompleted
  };
};
