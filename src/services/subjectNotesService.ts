import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function fetchSubjectNotes(subjectId: string) {
  const { data, error } = await supabase.from('subjects').select('notes').eq('id', subjectId).single();
  if (error) throw error;
  return data?.notes as Json | null;
}
export async function saveSubjectNotes(subjectId: string, notes: Json) {
  const { error } = await supabase.from('subjects').update({ notes, updated_at: new Date().toISOString() }).eq('id', subjectId);
  if (error) throw error;
}
