import { supabase } from '@/integrations/supabase/client';

export async function fetchCycleResetStats(userId: string) {
  const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id, status, updated_at').eq('user_id', userId);
  if (subjectsError) throw subjectsError;
  const ids = subjects?.map(s => s.id) ?? [];
  const { data: topics, error: topicsError } = ids.length ? await supabase.from('topics').select('id, review_count, notes, updated_at').in('subject_id', ids) : { data: [], error: null };
  if (topicsError) throw topicsError;
  const { data: cycle } = await supabase.from('user_cycles').select('ciclos_realizados, atualizado_em').eq('user_id', userId).maybeSingle();
  return { subjects: subjects ?? [], topics: topics ?? [], cycle };
}

export async function resetCycleStudyData(userId: string) {
  const { data: subjects, error } = await supabase.from('subjects').select('id').eq('user_id', userId);
  if (error) throw error;
  const ids = (subjects ?? []).map(s => s.id);
  if (!ids.length) return;
  const now = new Date().toISOString();
  const { error: topicsError } = await supabase.from('topics').update({ review_stage: null, review_count: 0, next_review: null, last_reviewed_at: null, completed: false, updated_at: now }).in('subject_id', ids);
  if (topicsError) throw topicsError;
  const { error: subjectsError } = await supabase.from('subjects').update({ status: 'Nova', updated_at: now }).eq('user_id', userId);
  if (subjectsError) throw subjectsError;
}
