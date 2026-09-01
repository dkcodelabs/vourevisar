import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { withTimeout } from '@/utils/withTimeout';

export type UserEditalRow = Database['public']['Tables']['user_editais']['Row'];
export type StudySessionRow = Pick<
  Database['public']['Tables']['study_sessions']['Row'],
  'edital_id' | 'subject_id' | 'session_duration_minutes'
>;

export async function fetchEditaisPageData(userId: string) {
  const [{ data: editais, error: editaisError }, { data: sessions, error: sessionsError }] = await Promise.all([
    withTimeout(
      supabase.from('user_editais').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      10000,
      'Carregamento de editais',
    ),
    withTimeout(
      supabase.from('study_sessions').select('edital_id, subject_id, session_duration_minutes').eq('user_id', userId),
      10000,
      'Carregamento de sessoes de estudo',
    ),
  ]);

  if (editaisError) throw editaisError;
  if (sessionsError) throw sessionsError;

  return {
    editais: (editais ?? []) as UserEditalRow[],
    sessions: (sessions ?? []) as StudySessionRow[],
  };
}
