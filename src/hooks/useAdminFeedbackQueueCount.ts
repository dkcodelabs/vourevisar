import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAdminPendingFeedbackCount } from '@/services/adminFeedbackBadgeService';

const ADMIN_FEEDBACK_QUEUE_COUNT_QUERY_KEY = ['admin-feedback-queue-count'];

export function useAdminFeedbackQueueCount(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ADMIN_FEEDBACK_QUEUE_COUNT_QUERY_KEY,
    queryFn: getAdminPendingFeedbackCount,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channel = supabase
      .channel('admin-feedback-queue-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_feedback_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ADMIN_FEEDBACK_QUEUE_COUNT_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return {
    pendingCount: query.data ?? 0,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
