import { supabase } from '@/integrations/supabase/client';
export async function fetchDifficultyEvolution(userId: string, cycleId?: string) {
  let query = supabase.from('topic_review_history').select('reviewed_at, difficulty_numeric, trend_label').eq('user_id', userId).not('difficulty_numeric', 'is', null).order('reviewed_at', { ascending: true });
  if (cycleId) query = query.eq('cycle_id', cycleId);
  const { data, error } = await query.limit(60);
  if (error) throw error;
  return data ?? [];
}
