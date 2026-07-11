import { supabase } from '@/integrations/supabase/client';

export type ActiveTopicDestination = 'cycle' | 'reviews';

export type ActiveTopicContext = {
  topicId: string;
  subjectId: string | null;
  topicName: string;
  subjectName: string;
  destination: ActiveTopicDestination;
};

type TopicContextRow = {
  id: string;
  name: string | null;
  subject_id: string | null;
  review_count: number | null;
  first_studied_at: string | null;
  subjects?: { name?: string | null } | { name?: string | null }[] | null;
};

const getSubjectName = (subjects: TopicContextRow['subjects']) => {
  const subject = Array.isArray(subjects) ? subjects[0] : subjects;
  return subject?.name || 'Revisão';
};

export const getActiveTopicDestination = ({
  first_studied_at,
  review_count,
}: Pick<TopicContextRow, 'first_studied_at' | 'review_count'>): ActiveTopicDestination => (
  (review_count || 0) > 0 || Boolean(first_studied_at)
    ? 'reviews'
    : 'cycle'
);

export async function fetchActiveTopicContext(topicId: string): Promise<ActiveTopicContext> {
  const { data } = await supabase
    .from('topics')
    .select('id, name, subject_id, review_count, first_studied_at, subjects(name)')
    .eq('id', topicId)
    .single();

  const row = data as TopicContextRow | null;

  if (!row) {
    return {
      topicId,
      subjectId: null,
      topicName: 'Tópico Ativo',
      subjectName: 'Revisão',
      destination: 'reviews',
    };
  }

  return {
    topicId,
    subjectId: row.subject_id || null,
    topicName: row.name || 'Tópico Ativo',
    subjectName: getSubjectName(row.subjects),
    destination: getActiveTopicDestination(row),
  };
}
