import { supabase } from '@/integrations/supabase/client';

export async function fetchReviewHistory(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return [];
  const { data, error } = await supabase
    .from('topic_review_history')
    .select('id, topic_id, review_stage, reviewed_at, topics!inner (id, name, subject_id)')
    .eq('user_id', userId)
    .in('topic_id', topicIds)
    .order('reviewed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReviewTrends(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return [];
  const { data, error } = await supabase
    .from('topic_review_history')
    .select('topic_id, trend_label, trend_delta, reviewed_at')
    .eq('user_id', userId)
    .in('topic_id', topicIds)
    .not('trend_label', 'is', null)
    .order('reviewed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFirstContactDurations(userId: string, cycleId: string) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('session_duration_minutes')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .eq('contact_type', 'first_contact')
    .not('session_duration_minutes', 'is', null);
  if (error) throw error;
  return (data ?? [])
    .map((session) => session.session_duration_minutes)
    .filter((minutes): minutes is number => typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0);
}
