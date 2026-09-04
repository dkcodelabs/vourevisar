import { supabase } from '@/integrations/supabase/client';

export interface AdminPublicEdital {
  id: string; organ: string; position: string; year: string; category: string;
  exam_date?: string; exam_board?: string | null; is_public?: boolean; status?: string; created_at?: string;
}
export interface AdminEditalSuggestion {
  id: string; user_id: string; concurso: string;
  status: 'pending' | 'cadastrado' | 'ja_cadastrado' | 'nao_cadastrado';
  response_message?: string; responded_at?: string; created_at: string;
}

export async function fetchAdminEditais(): Promise<AdminPublicEdital[]> {
  const { data, error } = await supabase.from('public_editais').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminPublicEdital[];
}
export async function fetchAdminEditalSuggestions(): Promise<AdminEditalSuggestion[]> {
  const { data, error } = await supabase.from('edital_suggestions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminEditalSuggestion[];
}
export async function saveAdminEdital(id: string | null, payload: Record<string, unknown>) {
  const result = id
    ? await supabase.from('public_editais').update(payload as never).eq('id', id)
    : await supabase.from('public_editais').insert([payload]);
  if (result.error) throw result.error;
}
export async function deleteAdminEdital(id: string) {
  const { error } = await supabase.from('public_editais').delete().eq('id', id);
  if (error) throw error;
}
export async function respondToAdminEditalSuggestion(suggestion: AdminEditalSuggestion, status: Exclude<AdminEditalSuggestion['status'], 'pending'>, message: string) {
  const { error } = await supabase.from('edital_suggestions').update({ status, response_message: message, responded_at: new Date().toISOString() }).eq('id', suggestion.id);
  if (error) throw error;
  const { error: notificationError } = await supabase.from('user_notifications').insert({
    user_id: suggestion.user_id, title: `Resposta sobre "${suggestion.concurso}"`, message,
    type: status === 'cadastrado' ? 'success' : status === 'nao_cadastrado' ? 'warning' : 'info', read: false,
    data: { reference_type: 'edital_suggestion', reference_id: suggestion.id },
  });
  if (notificationError) throw notificationError;
}
