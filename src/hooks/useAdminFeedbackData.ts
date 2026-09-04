import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchAdminFeedbacks } from '@/services/adminFeedbackService';
import { normalizeFeedbackStatus } from '@/services/feedbackService';
import type { FeedbackRecord } from '@/components/admin/adminFeedbackConfig';

type UseAdminFeedbackDataInput = {
  endDate: string;
  search: string;
  startDate: string;
  statusFilter: string;
  typeFilter: string;
};

export function useAdminFeedbackData({
  endDate,
  search,
  startDate,
  statusFilter,
  typeFilter,
}: UseAdminFeedbackDataInput) {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminFeedbacks({ status: statusFilter, type: typeFilter, startDate, endDate });
      let result = ((data ?? []) as unknown as FeedbackRecord[]).map(feedback => ({
        ...feedback,
        status: normalizeFeedbackStatus(feedback.status),
      }));

      if (search.trim()) {
        const query = search.toLowerCase();
        result = result.filter(feedback => (
          feedback.protocol_code?.toLowerCase().includes(query) ||
          feedback.title.toLowerCase().includes(query) ||
          feedback.actor_email?.toLowerCase().includes(query)
        ));
      }

      setFeedbacks(result);
      const params = new URLSearchParams();
      if (statusFilter !== 'todas') params.set('status', statusFilter);
      if (typeFilter !== 'todos') params.set('type', typeFilter);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (search) params.set('q', search);
      window.history.replaceState(null, '', `?${params.toString()}`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar feedbacks');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, search, startDate, statusFilter, typeFilter]);

  useEffect(() => { void fetchFeedbacks(); }, [fetchFeedbacks]);

  const kpis = useMemo(() => ({
    total: feedbacks.length,
    novos: feedbacks.filter(feedback => feedback.status === 'nova').length,
    emDev: feedbacks.filter(feedback => feedback.status === 'em_desenvolvimento').length,
    concluidos: feedbacks.filter(feedback => feedback.status === 'concluida').length,
    naoPlanejadas: feedbacks.filter(feedback => feedback.status === 'nao_planejada').length,
  }), [feedbacks]);

  return { error, feedbacks, fetchFeedbacks, isLoading, kpis };
}
