import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCycleComparison } from '@/services/cycleComparisonService';

export function useCycleComparison(userCycleId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cycle-comparison', user?.id, userCycleId],
    enabled: Boolean(user?.id && userCycleId),
    staleTime: 60_000,
    refetchOnMount: 'always',
    queryFn: () => {
      if (!user?.id || !userCycleId) throw new Error('Ciclo não disponível.');
      return fetchCycleComparison({ userId: user.id, userCycleId });
    },
  });
}
