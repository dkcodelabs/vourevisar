import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCycleState } from '@/hooks/useCycleState';
import { fetchFirstContactDurations, fetchReviewHistory, fetchReviewTrends } from '@/services/reviewsPageDataService';
import { filterHistoryRowsByActiveTopicIds } from '@/utils/cycleAnalyticsScope';
import { buildLatestTrustedReviewTrendByTopic, type ReviewTrendHistoryRow } from '@/utils/reviewTrend';
import type { ReviewHistoryItem } from '@/types/revision';

type TopicScope = { scopeKey: string; activeTopicIds: string[]; hasScopedData: boolean };

export function useReviewsPageAnalytics(scope: TopicScope) {
  const { user } = useAuth();
  const { userCycle } = useCycleState();
  const scopeKey = useMemo(() => scope.scopeKey, [scope.scopeKey]);

  const history = useQuery({
    queryKey: ['reviews-page-history', user?.id, scopeKey],
    queryFn: async (): Promise<ReviewHistoryItem[]> => {
      if (!user) throw new Error('User not authenticated');
      if (!scope.hasScopedData) return [];
      const response = await fetchReviewHistory(user.id, scope.activeTopicIds);
      return filterHistoryRowsByActiveTopicIds(response, scope.activeTopicIds).map(review => {
        const topic = Array.isArray(review.topics) ? review.topics[0] : review.topics;
        return { id: review.id, topic_id: review.topic_id, review_stage: review.review_stage, reviewed_at: review.reviewed_at, topic_name: topic?.name, subject_id: topic?.subject_id };
      });
    },
    enabled: Boolean(user?.id),
  });

  const trends = useQuery({
    queryKey: ['reviews-page-trends', user?.id, scopeKey],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!scope.hasScopedData) return new Map();
      return buildLatestTrustedReviewTrendByTopic(await fetchReviewTrends(user.id, scope.activeTopicIds) as ReviewTrendHistoryRow[]);
    },
    enabled: Boolean(user?.id && scope.hasScopedData),
  });

  const firstContact = useQuery({
    queryKey: ['reviews-first-contact-durations', user?.id, userCycle?.id],
    queryFn: () => user?.id && userCycle?.id ? fetchFirstContactDurations(user.id, userCycle.id) : Promise.resolve([]),
    enabled: Boolean(user?.id && userCycle?.id),
  });

  return {
    reviewData: history.data ?? [],
    refetchHistory: history.refetch,
    reviewTrendByTopic: trends.data ?? new Map(),
    refetchReviewTrends: trends.refetch,
    firstContactStudyDurationsMinutes: firstContact.data ?? [],
  };
}
