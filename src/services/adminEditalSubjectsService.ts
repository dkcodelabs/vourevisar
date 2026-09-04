import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function updatePublicEditalSubjects(editalId: string, subjects: Json) {
  const { error } = await supabase.from('public_editais').update({ subjects, updated_at: new Date().toISOString() }).eq('id', editalId);
  if (error) throw error;
}

export async function notifyEditalUsers(userIds: string[], editalId: string, editalName: string) {
  if (!userIds.length) return;
  const { error } = await supabase.from('user_notifications').insert(userIds.map((userId) => ({ user_id: userId, type: 'update_edital', category: 'sistema', title: 'Matriz de Estudos', message: `O edital ${editalName} foi atualizado.`, action_url: `/meus-editais?sourceId=${editalId}`, read: false, created_at: new Date().toISOString() })));
  if (error) throw error;
}
