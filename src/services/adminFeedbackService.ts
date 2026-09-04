import { supabase } from '@/integrations/supabase/client';

export interface AdminFeedbackFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

/** Busca feedbacks administrativos mantendo filtros e paginação fora da página. */
export async function fetchAdminFeedbacks(filters: AdminFeedbackFilters = {}) {
  let query = supabase
    .from('user_feedback_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'todas') query = query.eq('status', filters.status);
  if (filters.type && filters.type !== 'todos') query = query.eq('type', filters.type);
  if (filters.startDate) query = query.gte('created_at', new Date(filters.startDate).toISOString());
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function updateAdminFeedback(
  feedbackId: string,
  updates: Record<string, unknown>,
  audit: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('user_feedback_events')
    .update(updates as never)
    .eq('id', feedbackId);
  if (error) throw error;
  await writeAdminFeedbackAudit('feedback_status_change', audit);
}

export async function deleteAdminFeedback(
  feedbackId: string,
  audit: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('user_feedback_events')
    .delete()
    .eq('id', feedbackId);
  if (error) throw error;
  await writeAdminFeedbackAudit('feedback_deleted', audit);
}

async function writeAdminFeedbackAudit(eventType: string, metadata: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    event_type: eventType,
    event_category: 'admin_action',
    description: String(metadata.description ?? eventType),
    metadata,
  } as never);
  if (error) throw error;
}
