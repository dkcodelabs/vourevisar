import { supabase } from '@/integrations/supabase/client';

export async function getAdminPendingFeedbackCount(): Promise<number> {
  const { count, error } = await supabase
    .from('user_feedback_events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'nova');

  if (error) {
    throw error;
  }

  return count ?? 0;
}
