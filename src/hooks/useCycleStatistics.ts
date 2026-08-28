import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCycleStatisticsSource } from '@/services/cycleStatisticsService';
import type { CycleStatisticsPeriod } from '@/types/cycleStatistics';
import { buildCycleStatistics } from '@/utils/cycleStatistics';

export function useCycleStatistics(period: CycleStatisticsPeriod) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cycle-statistics', user?.id, period],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    // O ciclo pode ser carregado em outra rota enquanto esta query mantém um
    // resultado vazio como recente. Sempre reconcilie os dados ao voltar para
    // Evolução para não exibir um falso estado sem ciclo.
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      const source = await fetchCycleStatisticsSource({ userId: user.id, period });
      if (!source.cycle) return null;
      return buildCycleStatistics({
        cycle: source.cycle,
        editalNames: source.editalNames,
        period,
        topics: source.topics,
        subjects: source.subjects,
        sessions: source.sessions,
      });
    },
  });
}
