import { supabase } from '@/integrations/supabase/client';

export async function fetchAccountActiveStatus(userId: string) {
  const { data, error } = await supabase.from('profiles').select('is_active').eq('id', userId).single();
  if (error) throw error;
  return data?.is_active ?? true;
}
