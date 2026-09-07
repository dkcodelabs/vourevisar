import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getActivationSnapshot } from '@/features/activation/services/activationService';
import { getActivationJourney } from '@/features/activation/utils/activationJourney';

export const activationKeys = {
  all: ['activation'] as const,
  journey: (userId: string | undefined) => [...activationKeys.all, 'journey', userId] as const,
};

export function useActivationJourney(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: activationKeys.journey(user?.id),
    queryFn: () => getActivationSnapshot(user!.id),
    enabled: enabled && Boolean(user?.id),
    staleTime: 15_000,
    refetchOnMount: 'always',
  });

  return {
    ...query,
    journey: query.data ? getActivationJourney(query.data) : null,
  };
}
