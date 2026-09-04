import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function fetchGeneralNotes(userId: string) { const { data, error } = await supabase.from('general_notes').select('*').eq('user_id', userId).maybeSingle(); if (error) throw error; return data; }
export async function fetchGeneralReminders(userId: string) { const { data, error } = await supabase.from('general_reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data ?? []; }

export async function updateMissingNoteDates(userId: string) {
  const generateDate = () => {
    const now = Date.now();
    return new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
  };

  const [{ data: topics, error: topicsError }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase.from('topics').select('id, subjects!inner(user_id)').eq('subjects.user_id', userId).is('updated_at', null),
    supabase.from('subjects').select('id').eq('user_id', userId).is('updated_at', null),
  ]);
  if (topicsError) throw topicsError;
  if (subjectsError) throw subjectsError;

  await Promise.all([
    ...(topics ?? []).map(({ id }) => supabase.from('topics').update({ updated_at: generateDate() }).eq('id', id)),
    ...(subjects ?? []).map(({ id }) => supabase.from('subjects').update({ updated_at: generateDate() }).eq('id', id)),
  ]);
}

export async function fetchAllNotesData(userId: string) {
  const [{ data: topics, error: topicsError }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase.from('topics').select('id, name, notes, updated_at, created_at, subject_id, subjects!inner(user_id, name)').eq('subjects.user_id', userId).not('notes', 'is', null),
    supabase.from('subjects').select('id, name, notes, updated_at, created_at').eq('user_id', userId).not('notes', 'is', null),
  ]);
  if (topicsError) throw topicsError;
  if (subjectsError) throw subjectsError;
  return { topics: topics ?? [], subjects: subjects ?? [] };
}

export async function saveGeneralNotes(userId: string, content: Json) {
  const { error } = await supabase.from('general_notes').upsert({ user_id: userId, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function createGeneralReminder(userId: string, text: string, reminderDate: string | null) {
  const { data, error } = await supabase.from('general_reminders').insert({ user_id: userId, text, reminder_date: reminderDate, completed: false }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGeneralReminder(id: string) {
  const { error } = await supabase.from('general_reminders').delete().eq('id', id);
  if (error) throw error;
}

export async function setGeneralReminderCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from('general_reminders').update({ completed }).eq('id', id);
  if (error) throw error;
}

export async function updateGeneralReminder(id: string, text: string, reminderDate: string | null) {
  const { error } = await supabase.from('general_reminders').update({ text, reminder_date: reminderDate }).eq('id', id);
  if (error) throw error;
}
