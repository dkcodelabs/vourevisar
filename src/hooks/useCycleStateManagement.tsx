
import { useState, useEffect } from 'react';
import { UserCycle } from '@/types';

export const useCycleStateManagement = () => {
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isCycleCompleted, setIsCycleCompleted] = useState(false);

  useEffect(() => {
    if (!userCycle) return;
    const cycleCompleted = userCycle.ciclo_atual.length === 0 && Boolean(userCycle.data_fim_ciclo);
    setIsCycleCompleted(cycleCompleted);
  }, [userCycle]);

  return {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    setIsCycleCompleted
  };
};
