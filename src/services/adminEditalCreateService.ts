import { supabase } from '@/integrations/supabase/client';
export async function createPublicEdital(payload: Record<string, unknown>) {
  const { error } = await supabase.from('public_editais').insert([payload]);
  if (error) throw error;
}
