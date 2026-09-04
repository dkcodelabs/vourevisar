import { supabase } from '@/integrations/supabase/client';

export interface AdminAiUsageLog {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  model_name: string;
  mode: string;
  prompt_tokens: number;
  candidates_tokens: number;
  cost_estimate: number;
  status: string;
  created_at: string;
}

export async function fetchAdminAiUsageLogs(): Promise<AdminAiUsageLog[]> {
  const { data, error } = await supabase
    .from('ai_usage_logs' as never)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const logs = (data ?? []) as unknown as AdminAiUsageLog[];
  if (!logs.length) return [];

  const userIds = Array.from(new Set(logs.map(log => log.user_id)));
  const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
  return logs.map(log => {
    const profile = profiles?.find(item => item.id === log.user_id);
    return { ...log, user_email: profile?.email ?? 'N/A', user_name: profile?.name ?? 'Unnamed User' };
  });
}

export async function fetchAiDailyBudget(): Promise<number> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ai_edital_config')
    .maybeSingle();
  const config = (data?.value ?? {}) as { daily_budget_usd?: number };
  return typeof config.daily_budget_usd === 'number' ? config.daily_budget_usd : 5;
}
