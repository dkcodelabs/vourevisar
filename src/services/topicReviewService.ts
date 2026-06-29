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

export async function fetchTopicReviewStudyMinutes(
  topicIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (topicIds.length === 0) return map;

  try {
    const uniqueTopicIds = Array.from(new Set(topicIds.filter(Boolean)));
    const chunkSize = 150;

    for (let index = 0; index < uniqueTopicIds.length; index += chunkSize) {
      const chunk = uniqueTopicIds.slice(index, index + chunkSize);
      const { data, error } = await supabase
        .from('topic_review_history')
        .select('topic_id, study_duration_minutes')
        .in('topic_id', chunk);

      if (error || !data) {
        console.warn('[topicReviewService] lote de tempo de estudo falhou:', error);
        continue;
      }

      for (const row of data as { topic_id: string; study_duration_minutes: number | null }[]) {
        const duration = Math.max(0, row.study_duration_minutes || 0);
        if (duration <= 0) continue;
        map.set(row.topic_id, (map.get(row.topic_id) || 0) + duration);
      }
    }
  } catch (e) {
    console.warn('[topicReviewService] fetchTopicReviewStudyMinutes falhou (não-bloqueante):', e);
  }

  return map;
}
