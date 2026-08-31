import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getPracticeOverview } from '@/features/practice/services/practiceService';

const practiceOverviewKey = (userId?: string, topicId?: string) =>
  ['practice-overview', userId, topicId] as const;

export const usePracticeOverview = (
  userId?: string,
  topicId?: string,
  enabled = true,
  pollWhileGenerating = false,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !enabled || typeof window === 'undefined') return;

    const invalidatePracticeOverview = () => {
      void queryClient.invalidateQueries({ queryKey: ['practice-overview', userId] });
    };
    const events = ['topicUpdated', 'subjectUpdated', 'cycleUpdated', 'mergeUpdated'];

    events.forEach((eventName) => window.addEventListener(eventName, invalidatePracticeOverview));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, invalidatePracticeOverview));
  }, [enabled, queryClient, userId]);

  return useQuery({
    queryKey: practiceOverviewKey(userId, topicId),
    enabled: Boolean(userId) && enabled,
    queryFn: () => getPracticeOverview(topicId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4_000),
    refetchInterval: (query) => (
      pollWhileGenerating || query.state.data?.materialTopics.some((topic) => topic.isGenerating)
        ? 2_000
        : false
    ),
  });
};
