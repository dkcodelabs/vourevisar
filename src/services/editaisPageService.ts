import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { withTimeout } from '@/utils/withTimeout';
import type { Json } from '@/integrations/supabase/types';

export const editaisPageDataClient = supabase;

export type UserEditalRow = Database['public']['Tables']['user_editais']['Row'];
export type StudySessionRow = Pick<
  Database['public']['Tables']['study_sessions']['Row'],
  'edital_id' | 'subject_id' | 'session_duration_minutes'
>;

export async function fetchEditaisPageData(userId: string) {
  const [{ data: editais, error: editaisError }, { data: sessions, error: sessionsError }] = await Promise.all([
    withTimeout(
      supabase.from('user_editais').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      10000,
      'Carregamento de editais',
    ),
    withTimeout(
      supabase.from('study_sessions').select('edital_id, subject_id, session_duration_minutes').eq('user_id', userId),
      10000,
      'Carregamento de sessoes de estudo',
    ),
  ]);

  if (editaisError) throw editaisError;
  if (sessionsError) throw sessionsError;

  return {
    editais: (editais ?? []) as UserEditalRow[],
    sessions: (sessions ?? []) as StudySessionRow[],
  };
}

export async function fetchPublicEditaisData() {
  const { data, error } = await withTimeout(
    supabase.from('public_editais').select('id, updated_at, organ, position, year, category, exam_date, exam_board, subjects'),
    10000,
    'Carregamento de editais publicos',
  );
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingCycleMerges(userId: string) {
  const { data, error } = await withTimeout(
    supabase.from('pending_cycle_merges').select('*').eq('user_id', userId),
    10000,
    'Carregamento de mesclagens pendentes',
  );
  if (error) throw error;
  return data ?? [];
}

export async function savePendingCycleMerge(userId: string, editalId: string, stateData: Json, updatedAt: string) {
  const { error } = await supabase.from('pending_cycle_merges').upsert({ user_id: userId, edital_id: editalId, state_data: stateData, updated_at: updatedAt });
  if (error) throw error;
}

export async function deletePendingCycleMerge(userId: string, editalId: string | 'all') {
  let query = supabase.from('pending_cycle_merges').delete().eq('user_id', userId);
  if (editalId !== 'all') query = query.eq('edital_id', editalId);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchTopicsForMerge(ids: string[]) {
  const { data, error } = await supabase.from('topics').select('id, completed, review_count, review_stage, next_review, first_studied_at, last_reviewed_at, difficulty_level, difficulty_set_at, notes, memory_stability, current_interval, retention_score, total_reviews, last_session_duration, is_marked_for_review, marked_for_review_at').in('id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function updateTopicsForMerge(ids: string[], update: Record<string, unknown>) {
  const { error } = await supabase.from('topics').update(update as Database['public']['Tables']['topics']['Update']).in('id', ids);
  if (error) throw error;
}

export async function fetchUserCycleForEditalMerge(userId: string) {
  const { data, error } = await supabase.from('user_cycles').select('id, ciclo_atual, unification_map').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchEditalSubjectsWithTopics(subjectIds: string[]) {
  const { data, error } = await supabase.from('subjects').select('*, topics(*)').in('id', subjectIds);
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveSubjectMerges(userId: string) {
  const { data, error } = await supabase.from('subject_merges').select('*').eq('user_id', userId).is('reverted_at', null);
  if (error) throw error;
  return data ?? [];
}

type UnificationMap = {
  editalIds: string[];
  unifiedSubjects: Array<{ originalSubjectIds: string[]; [key: string]: unknown }>;
  [key: string]: unknown;
};

export async function deleteEditalData(userId: string, editalId: string, subjectIds: string[], unificationMap: unknown) {
  if (unificationMap && typeof unificationMap === 'object' && !Array.isArray(unificationMap)) {
    const map = unificationMap as UnificationMap;
    const subjectIdSet = new Set(subjectIds);
    const nextMap: UnificationMap = {
      ...map,
      editalIds: map.editalIds.filter(id => id !== editalId),
      unifiedSubjects: map.unifiedSubjects.map(subject => ({
        ...subject,
        originalSubjectIds: subject.originalSubjectIds.filter(id => !subjectIdSet.has(id)),
      })).filter(subject => subject.originalSubjectIds.length > 0),
    };
    const persistedMap = nextMap.editalIds.length > 0 ? nextMap : null;
    const { error } = await supabase.from('user_cycles').update({ unification_map: persistedMap }).eq('user_id', userId);
    if (error) throw error;
  }

  await supabase.from('pending_cycle_merges').delete().eq('user_id', userId).eq('edital_id', editalId);

  if (subjectIds.length > 0) {
    const topicRows = await supabase.from('topics').select('id').in('subject_id', subjectIds);
    if (topicRows.error) throw topicRows.error;
    const topicIds = (topicRows.data ?? []).map(topic => topic.id);
    const chunked = (ids: string[], size = 50) => Array.from({ length: Math.ceil(ids.length / size) }, (_, index) => ids.slice(index * size, index * size + size));

    for (const chunk of chunked(topicIds)) {
      await Promise.allSettled([
        supabase.from('topic_review_history').delete().in('topic_id', chunk),
        supabase.from('topic_merges').delete().in('primary_topic_id', chunk),
      ]);
      const { error } = await supabase.from('topics').delete().in('id', chunk);
      if (error) throw error;
    }
    for (const chunk of chunked(subjectIds)) {
      await Promise.allSettled([
        supabase.from('study_sessions').delete().in('subject_id', chunk),
        supabase.from('subject_merges').delete().in('primary_subject_id', chunk),
      ]);
      const { error } = await supabase.from('subjects').delete().in('id', chunk);
      if (error) throw error;
    }
  }

  const { data, error } = await supabase.from('user_editais').delete().eq('id', editalId).eq('user_id', userId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Nenhum edital foi removido no banco. A exclusão foi bloqueada ou o edital já não pertence ao usuário atual.');
}

export async function updateCycleDetails(userId: string, name: string, examDate: string | null) {
  const { error } = await supabase.from('user_cycles').update({ name: name.slice(0, 160), exam_date: examDate, atualizado_em: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
}

export async function updateUserEditalRecord(id: string, userId: string, update: Database['public']['Tables']['user_editais']['Update']) {
  const { error } = await supabase.from('user_editais').update(update).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function updateEditalRecord(id: string, update: Database['public']['Tables']['user_editais']['Update']) {
  const { error } = await supabase.from('user_editais').update(update).eq('id', id);
  if (error) throw error;
}

export async function fetchUserEditalById(id: string, userId: string) {
  const { data, error } = await supabase.from('user_editais').select('*').eq('id', id).eq('user_id', userId).single();
  if (error) throw error;
  return data;
}

export async function createMergedEdital(userId: string, name: string, subjectIds: string[], mergedWith: string[]) {
  const { error } = await supabase.from('user_editais').insert({ user_id: userId, name: `[Mesclado] ${name}`.substring(0, 200), is_imported: false, subject_ids: subjectIds, merged_with: mergedWith });
  if (error) throw error;
}

export async function deleteUserEditais(userId: string, ids: string[]) {
  const { error } = await supabase.from('user_editais').delete().in('id', ids).eq('user_id', userId);
  if (error) throw error;
}

export async function clearUserExamDateMeta(userId: string) {
  const { error } = await supabase.from('user_settings').update({ data_prova_meta: null }).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchCycleId(userId: string) {
  const { data, error } = await supabase.from('user_cycles').select('id').eq('user_id', userId).limit(1).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

type SyncTopic = { name: string; position?: number } | string;
type SyncSubject = { name: string; topics?: SyncTopic[] };

export async function applyEditalSyncContent(
  userId: string,
  editalId: string,
  initialSubjectIds: string[],
  addedSubjects: SyncSubject[],
  addedTopics: Record<string, string[]>,
  removedSubjectIds: string[],
  removedTopicIds: string[],
) {
  const finalSubjectIds = [...initialSubjectIds];

  for (const subject of addedSubjects) {
    const { data: created, error } = await supabase.from('subjects').insert({ user_id: userId, name: subject.name, status: 'Nova', edital_id: editalId }).select('id').single();
    if (error || !created) throw error ?? new Error('Matéria não foi criada.');
    finalSubjectIds.push(created.id);

    const topics = (subject.topics ?? []).map((topic, index) => ({
      subject_id: created.id,
      edital_id: editalId,
      name: typeof topic === 'string' ? topic : topic.name,
      completed: false,
      review_count: 0,
      position: typeof topic === 'string' ? index : topic.position ?? index,
    }));
    if (topics.length) {
      const { error: topicError } = await supabase.from('topics').insert(topics);
      if (topicError) throw topicError;
    }
  }

  for (const [subjectId, topicNames] of Object.entries(addedTopics)) {
    const topics = topicNames.map((name, index) => ({ subject_id: subjectId, edital_id: editalId, name, completed: false, review_count: 0, position: index }));
    if (topics.length) {
      const { error } = await supabase.from('topics').insert(topics);
      if (error) throw error;
    }
  }

  if (removedTopicIds.length) {
    const { error } = await supabase.from('topics').delete().in('id', removedTopicIds);
    if (error) throw error;
  }
  if (removedSubjectIds.length) {
    const { error: topicsError } = await supabase.from('topics').delete().in('subject_id', removedSubjectIds);
    if (topicsError) throw topicsError;
    const { error: subjectsError } = await supabase.from('subjects').delete().in('id', removedSubjectIds).eq('user_id', userId);
    if (subjectsError) throw subjectsError;
    const removed = new Set(removedSubjectIds);
    return { finalSubjectIds: finalSubjectIds.filter(id => !removed.has(id)) };
  }
  return { finalSubjectIds };
}
