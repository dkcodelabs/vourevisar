import { supabase } from '@/integrations/supabase/client';

export async function reactivateSubjects(subjectIds: string[], userId: string) {
  const { data: topics, error: topicsError } = await supabase.from('topics').select('id').in('subject_id', subjectIds);
  if (topicsError) throw topicsError;
  const { error: subjectsError } = await supabase.from('subjects').update({ status: 'Em Estudo', completed_at: null }).in('id', subjectIds);
  if (subjectsError) throw subjectsError;
  const topicIds = (topics ?? []).map((topic) => topic.id);
  if (topicIds.length) {
    const { error } = await supabase.from('topics').update({ completed: false, review_stage: '24h', next_review: new Date(Date.now() + 86400000).toISOString() }).in('id', topicIds);
    if (error) throw error;
  }
  const { error: cycleError } = await supabase.from('user_cycles').update({ ciclo_atual: [], disciplinas_do_dia: [], data_inicio_ciclo: new Date().toISOString(), data_fim_ciclo: null, atualizado_em: new Date().toISOString() }).eq('user_id', userId);
  if (cycleError) throw cycleError;
}
