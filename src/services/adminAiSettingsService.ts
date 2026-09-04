import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/utils/withTimeout';

export async function fetchAiSetting(key: string) {
  const { data, error } = await withTimeout(supabase.from('system_settings').select('value').eq('key', key).maybeSingle(), 8000, `Carregamento da configuração ${key}`);
  if (error) throw error;
  return data?.value ?? null;
}
export async function saveAiSetting(key: string, value: unknown, description?: string) {
  const { error } = await supabase.from('system_settings').upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
