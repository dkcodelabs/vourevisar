import { supabase } from '@/integrations/supabase/client';

/** Busca em lote contagem de revisões e revisões difíceis (difficulty_numeric = 3) para um conjunto de topic_ids */
export async function fetchTopicReviewStats(
  topicIds: string[]
): Promise<Map<string, { reviewCount: number; hardReviewCount: number }>> {
  const map = new Map<string, { reviewCount: number; hardReviewCount: number }>();
  if (topicIds.length === 0) return map;

  try {
    const uniqueTopicIds = Array.from(new Set(topicIds.filter(Boolean)));
    const chunkSize = 150;

    for (let index = 0; index < uniqueTopicIds.length; index += chunkSize) {
      const chunk = uniqueTopicIds.slice(index, index + chunkSize);
      const { data, error } = await supabase
        .from('topic_review_history')
        .select('topic_id, difficulty_numeric')
        .in('topic_id', chunk);

      if (error || !data) {
        console.warn('[topicReviewService] lote de estatisticas de revisao falhou:', error);
        continue;
      }

      for (const row of data as { topic_id: string; difficulty_numeric: number | null }[]) {
        const id = row.topic_id;
        if (!map.has(id)) map.set(id, { reviewCount: 0, hardReviewCount: 0 });
        const entry = map.get(id)!;
        entry.reviewCount++;
        if (row.difficulty_numeric === 3) entry.hardReviewCount++;
      }
    }
  } catch (e) {
    console.warn('[topicReviewService] fetchTopicReviewStats falhou (não-bloqueante):', e);
  }

  return map;
}
