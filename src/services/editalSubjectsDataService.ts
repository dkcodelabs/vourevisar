import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SubjectUpdate = Database['public']['Tables']['subjects']['Update'];
type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
type TopicInsert = Database['public']['Tables']['topics']['Insert'];
type TopicUpdate = Database['public']['Tables']['topics']['Update'];

export async function fetchActiveCycleUnificationMap(userId: string) {
  const { data, error } = await supabase.from('user_cycles').select('unification_map').eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle();
  return { data, error };
}

export async function fetchInactiveTopics(subjectId: string) {
  const { data, error } = await supabase.from('topics').select('id, name, completed, review_count, subject_id').eq('subject_id', subjectId).eq('is_active', false);
  if (error) throw error;
  return data ?? [];
}

export async function renameEditalTopic(topicId: string, name: string) {
  const { error } = await supabase.from('topics').update({ name }).eq('id', topicId);
  if (error) throw error;
}

export async function renameEditalSubject(subjectId: string, name: string) {
  const { error } = await supabase.from('subjects').update({ name }).eq('id', subjectId);
  if (error) throw error;
}

export async function updateEditalSubjectWeight(subjectId: string, update: SubjectUpdate) {
  const { error } = await supabase.from('subjects').update(update).eq('id', subjectId);
  if (error) throw error;
}

export async function deleteEditalTopic(topicId: string) {
  const { error: historyError } = await supabase.from('topic_review_history').delete().eq('topic_id', topicId);
  if (historyError) console.error('Erro ao excluir histórico do tópico:', historyError);
  const { error } = await supabase.from('topics').delete().eq('id', topicId);
  if (error) throw error;
}

export async function restoreEditalTopic(topicId: string) {
  const { error } = await supabase.from('topics').update({ is_active: true }).eq('id', topicId);
  if (error) throw error;
}

export async function insertEditalTopics(rows: TopicInsert[]) {
  const { data, error } = await supabase.from('topics').insert(rows).select();
  if (error) throw error;
  if (!data || data.length !== rows.length) throw new Error('O banco não confirmou todos os tópicos adicionados.');
  return data;
}

export async function createEditalSubject(row: SubjectInsert) {
  const { data, error } = await supabase.from('subjects').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function createEditalSubjects(rows: SubjectInsert[]) {
  const { data, error } = await supabase.from('subjects').insert(rows).select('id, name');
  if (error) throw error;
  if (!data || data.length !== rows.length) throw new Error('O banco não retornou todas as matérias criadas.');
  return data;
}

export async function deleteEditalSubjectsByIds(ids: string[]) {
  const { error } = await supabase.from('subjects').delete().in('id', ids);
  if (error) throw error;
}

export async function updateEditalSubjectIds(editalId: string, subjectIds: string[], activeSubjectIds?: string[]) {
  const update = activeSubjectIds ? { subject_ids: subjectIds, active_subject_ids: activeSubjectIds } : { subject_ids: subjectIds };
  const { error } = await supabase.from('user_editais').update(update).eq('id', editalId);
  if (error) throw error;
}

export async function updateEditalDetails(id: string, userId: string, update: Database['public']['Tables']['user_editais']['Update']) {
  const { error } = await supabase.from('user_editais').update(update).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function updateTopicsProgress(ids: string[], update: TopicUpdate) {
  const { error } = await supabase.from('topics').update(update).in('id', ids);
  if (error) throw error;
}

export async function createEditalTopic(row: TopicInsert) {
  const { data, error } = await supabase.from('topics').insert(row).select('id').single();
  if (error) throw error;
  return data;
}

export async function deleteEditalSubjectDeep(userId: string, subjectId: string, editalId: string, subjectIds: string[], activeSubjectIds: string[]) {
  const { data: topics, error: topicLookupError } = await supabase.from('topics').select('id').eq('subject_id', subjectId);
  if (topicLookupError) throw topicLookupError;
  const topicIds = (topics ?? []).map(topic => topic.id);

  if (topicIds.length > 0) {
    const { error: historyError } = await supabase.from('topic_review_history').delete().in('topic_id', topicIds);
    if (historyError) console.error('Erro ao excluir histórico da matéria:', historyError);
  }

  const { error: topicsError } = await supabase.from('topics').delete().eq('subject_id', subjectId);
  if (topicsError) throw topicsError;
  const { error: subjectError } = await supabase.from('subjects').delete().eq('id', subjectId);
  if (subjectError) throw subjectError;

  const { data: cycle } = await supabase.from('user_cycles').select('id, ciclo_atual').eq('user_id', userId).maybeSingle();
  let cycleChanged = false;
  if (cycle?.ciclo_atual) {
    const currentIds = cycle.ciclo_atual as string[];
    const nextIds = currentIds.filter(id => id !== subjectId);
    cycleChanged = nextIds.length !== currentIds.length;
    if (cycleChanged) {
      const { error } = await supabase.from('user_cycles').update({ ciclo_atual: nextIds, atualizado_em: new Date().toISOString() }).eq('id', cycle.id);
      if (error) throw error;
    }
  }

  await updateEditalSubjectIds(editalId, subjectIds, activeSubjectIds);
  return { cycleChanged };
}

/**
 * Boundary temporária para o recorte de matriz do edital.
 * As operações são migradas para funções de domínio por etapas, mas o cliente
 * do Supabase fica fora do componente durante a transição.
 */
export const editalSubjectsDataService = supabase;
