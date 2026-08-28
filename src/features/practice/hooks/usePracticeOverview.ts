import { useQuery } from '@tanstack/react-query';

import { getPracticeOverview } from '@/features/practice/services/practiceService';

const practiceOverviewKey = (userId?: string, topicId?: string) =>
  ['practice-overview', userId, topicId] as const;

export const usePracticeOverview = (userId?: string, topicId?: string) => useQuery({
  queryKey: practiceOverviewKey(userId, topicId),
  enabled: Boolean(userId),
  queryFn: () => getPracticeOverview(topicId),
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
});
