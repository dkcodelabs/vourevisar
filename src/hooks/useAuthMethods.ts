import { useQuery } from '@tanstack/react-query';
import { getMyAuthMethods } from '@/services/authMethodsService';

export const useAuthMethods = (userId?: string) => useQuery({
  queryKey: ['auth-methods', userId],
  queryFn: getMyAuthMethods,
  enabled: Boolean(userId),
  staleTime: 5 * 60 * 1000,
  retry: 1,
});
