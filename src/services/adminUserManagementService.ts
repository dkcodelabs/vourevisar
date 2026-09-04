import { supabase } from '@/integrations/supabase/client';

export async function softDeleteAdminUser(id: string) {
  const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
export async function restoreAdminUser(id: string) {
  const { error } = await supabase.from('profiles').update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}
export async function sendAdminPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw error;
}
