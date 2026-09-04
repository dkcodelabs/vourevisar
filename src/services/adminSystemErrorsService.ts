import { supabase } from '@/integrations/supabase/client';
import type { AlertEvent, ErrorLogRecord, ErrorStatus } from '@/lib/errors/types';

export interface SystemErrorFilters {
  status: string;
  severity: string;
  scope: string;
  category: string;
  recoverability: string;
  search: string;
  environment: string;
}

export async function fetchAdminErrors(filters: SystemErrorFilters): Promise<ErrorLogRecord[]> {
  let query = supabase.from('admin_error_events').select('*').order('created_at', { ascending: false }).limit(50);
  if (filters.status !== 'all') query = filters.status === 'active' ? query.neq('status', 'resolved') : query.eq('status', filters.status);
  if (filters.severity !== 'all') query = query.eq('severity', filters.severity);
  if (filters.scope !== 'all') query = query.eq('scope', filters.scope);
  if (filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.recoverability !== 'all') query = query.eq('recoverability', filters.recoverability);
  if (filters.search) query = query.or(`error_id.ilike.%${filters.search}%,user_message.ilike.%${filters.search}%,technical_message.ilike.%${filters.search}%`);
  if (filters.environment !== 'all') query = query.eq('environment', filters.environment);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ErrorLogRecord[];
}

export async function updateAdminErrorStatus(ids: string[], status: ErrorStatus) {
  const { error } = await supabase.from('admin_error_events').update({ status }).in('id', ids);
  if (error) throw error;
}

export async function updateAdminErrorClassification(id: string, feedback: boolean) {
  const { error } = await supabase.from('admin_error_events').update({ classification_feedback: feedback }).eq('id', id);
  if (error) throw error;
}

export async function fetchActiveAdminAlerts(): Promise<AlertEvent[]> {
  const { data, error } = await supabase.from('admin_alert_events').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlertEvent[];
}

export async function acknowledgeAdminAlert(id: string) {
  const { error } = await supabase.from('admin_alert_events').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
