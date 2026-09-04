import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
export async function fetchTopicNotesData(topicId: string) { const { data, error } = await supabase.from('topics').select('notes, subtopics').eq('id', topicId).single(); if (error) throw error; return data; }
export async function saveTopicNotes(topicId: string, notes: Json) { const { error } = await supabase.from('topics').update({ notes, updated_at: new Date().toISOString() }).eq('id', topicId); if (error) throw error; }
export async function saveTopicNotesAndSubtopics(topicId: string, notes: Json, subtopics: Json) { const { error } = await supabase.from('topics').update({ notes, subtopics, updated_at: new Date().toISOString() }).eq('id', topicId); if (error) throw error; }
