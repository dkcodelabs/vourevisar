import { useCallback, useEffect, useState } from 'react';

import { errorService } from '@/lib/errors/errorService';
import {
  discardPendingMergeSuggestions,
  fetchPendingMergeSuggestions,
  updateSuggestionStatus,
  type PendingSuggestion,
} from '@/services/cycleMergeService';
import { fetchTopicsForMerge, updateTopicsForMerge } from '@/services/editaisPageService';
import { buildConsolidatedTopicProgress, type TopicProgressRow } from '@/utils/topicProgressConsolidation';

type UseEditaisPendingSuggestionsInput = {
  editaisCount: number;
  isLoading: boolean;
  userId?: string;
};

export function useEditaisPendingSuggestions({ editaisCount, isLoading, userId }: UseEditaisPendingSuggestionsInput) {
  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const loadPendingSuggestions = useCallback(async () => {
    if (!userId) return;
    setIsLoadingSuggestions(true);
    try {
      setPendingSuggestions(await fetchPendingMergeSuggestions(userId));
    } catch (error) {
      console.error('[Editais] Erro ao carregar sugestões:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [userId]);

  useEffect(() => {
    const checkAndLoadSuggestions = async () => {
      if (!userId) return;
      if (editaisCount === 0 && !isLoading) {
        const suggestions = await fetchPendingMergeSuggestions(userId);
        if (suggestions.length > 0) {
          console.log('[Editais] Limpando sugestões órfãs (zero editais)');
          await discardPendingMergeSuggestions(userId);
          setPendingSuggestions([]);
        }
        return;
      }
      await loadPendingSuggestions();
    };
    void checkAndLoadSuggestions();
  }, [editaisCount, isLoading, loadPendingSuggestions, userId]);

  const handleApproveSuggestion = useCallback(async (suggestion: PendingSuggestion) => {
    try {
      const originalIds = (suggestion.original_ids as string[] | undefined) || [];
      if (originalIds.length >= 2) {
        const topicsData = await fetchTopicsForMerge(originalIds);
        if (topicsData && topicsData.length > 0) {
          const primaryId = originalIds[0];
          const consolidatedProgress = buildConsolidatedTopicProgress(topicsData as TopicProgressRow[]);
          if (consolidatedProgress) await updateTopicsForMerge(originalIds, consolidatedProgress);
          await updateTopicsForMerge(originalIds.slice(1), { parent_topic_id: primaryId });
        }
      }
      await updateSuggestionStatus(suggestion.id, 'approved');
      setPendingSuggestions(prev => prev.filter(item => item.id !== suggestion.id));
    } catch (error) {
      void errorService.report(error, { module: 'merge', action: 'approve', userMessage: 'Erro ao unificar tópicos.' });
    }
  }, []);

  const handleRejectSuggestion = useCallback(async (suggestion: PendingSuggestion) => {
    try {
      await updateSuggestionStatus(suggestion.id, 'rejected');
      setPendingSuggestions(prev => prev.filter(item => item.id !== suggestion.id));
    } catch (error) {
      void errorService.report(error, { module: 'merge', action: 'reject', userMessage: 'Erro ao rejeitar sugestão.' });
    }
  }, []);

  return {
    discardPendingMergeSuggestions,
    handleApproveSuggestion,
    handleRejectSuggestion,
    isLoadingSuggestions,
    loadPendingSuggestions,
    pendingSuggestions,
    setPendingSuggestions,
  };
}
