import { supabase } from '@/integrations/supabase/client';
export async function fetchUserActivity(userId: string) {
  const { data, error } = await supabase.from('user_events').select('*').or(`target_user_id.eq.${userId},user_id.eq.${userId}`).order('occurred_at', { ascending: false }).limit(20);
  if (error) throw error;
  const events = data ?? [];
  const ids = [...new Set(events.filter(e => e.actor_user_id && e.actor_user_id !== userId).map(e => e.actor_user_id))];
  if (!ids.length) return { events, profiles: [] };
  const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', ids);
  return { events, profiles: profiles ?? [] };
}
