import { supabase } from '@/integrations/supabase/client';

export async function renameTopic(topicId: string, name: string) {
  const { error } = await supabase.from('topics').update({ name }).eq('id', topicId);
  if (error) throw error;
}
export async function createTopic(input: { subjectId: string; editalId?: string; name: string }) {
  const { data, error } = await supabase.from('topics').insert({ subject_id: input.subjectId, edital_id: input.editalId, name: input.name, completed: false, review_count: 0 }).select().single();
  if (error) throw error;
  return data;
}
