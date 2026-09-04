import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function fetchReviewTopicNotes(topicId: string) {
  const { data, error } = await supabase
    .from('topics')
    .select('notes, subtopics, subject_id')
    .eq('id', topicId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReviewSubjectNotes(subjectId: string) {
  const { data, error } = await supabase.from('subjects').select('notes').eq('id', subjectId).single();
  if (error) throw error;
  return data;
}

export async function updateReviewTopicNotes(topicId: string, updates: Json) {
  const { error } = await supabase.from('topics').update(updates as never).eq('id', topicId);
  if (error) throw error;
}

export async function updateReviewSubjectNotes(subjectId: string, updates: Json) {
  const { error } = await supabase.from('subjects').update(updates as never).eq('id', subjectId);
  if (error) throw error;
}
