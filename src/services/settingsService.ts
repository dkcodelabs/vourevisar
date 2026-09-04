import { supabase } from '@/integrations/supabase/client';

export async function fetchSettings(userId: string) {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createSettings(userId: string, settings: Record<string, unknown>) { const { error } = await supabase.from('user_settings').insert({ ...settings, user_id: userId }); if (error) throw error; }
export async function saveSettings(userId: string, settings: Record<string, unknown>) { const { error } = await supabase.from('user_settings').upsert({ ...settings, user_id: userId, updated_at: new Date().toISOString() }); if (error) throw error; }
export async function clearUserStudyData(userId: string) {
  const { data: subjects, error } = await supabase.from('subjects').select('id').eq('user_id', userId); if (error) throw error;
  const ids = (subjects ?? []).map((s) => s.id);
  if (ids.length) { const { data: topics } = await supabase.from('topics').select('id').in('subject_id', ids); const topicIds = (topics ?? []).map((t) => t.id); if (topicIds.length) await supabase.from('topic_review_history').delete().in('topic_id', topicIds); await supabase.from('topics').delete().in('subject_id', ids); await supabase.from('subjects').delete().eq('user_id', userId); }
  await Promise.all([supabase.from('user_cycles').delete().eq('user_id', userId), supabase.from('study_sessions').delete().eq('user_id', userId), supabase.from('study_cycles_v2').delete().eq('user_id', userId), supabase.from('general_notes').delete().eq('user_id', userId), supabase.from('user_editais').delete().eq('user_id', userId)]);
}
