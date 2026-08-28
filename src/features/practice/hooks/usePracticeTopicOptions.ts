import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

export type PracticeSubjectOption = { id: string; name: string };
export type PracticeTopicOption = { id: string; name: string; subjectId: string };

const practiceTopicKeys = {
  all: ['practice-topic-options'] as const,
  subjects: (userId?: string, subjectIds?: string[]) => [...practiceTopicKeys.all, 'subjects', userId, subjectIds] as const,
  topics: (userId?: string, subjectId?: string) => [...practiceTopicKeys.all, 'topics', userId, subjectId] as const,
};

export const usePracticeSubjects = (userId?: string, activeSubjectIds?: string[]) => useQuery({
  queryKey: practiceTopicKeys.subjects(userId, activeSubjectIds),
  enabled: Boolean(userId && activeSubjectIds?.length),
  queryFn: async (): Promise<PracticeSubjectOption[]> => {
    if (!userId || !activeSubjectIds?.length) return [];
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', userId)
      .in('id', activeSubjectIds)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 60_000,
});

export const usePracticeTopics = (userId?: string, subjectId?: string) => useQuery({
  queryKey: practiceTopicKeys.topics(userId, subjectId),
  enabled: Boolean(userId && subjectId),
  queryFn: async (): Promise<PracticeTopicOption[]> => {
    if (!userId || !subjectId) return [];
    const { data, error } = await supabase
      .from('topics')
      .select('id, name, subject_id')
      .eq('subject_id', subjectId)
      .neq('is_active', false)
      .order('name');
    if (error) throw error;
    return (data ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      subjectId: topic.subject_id,
    }));
  },
  staleTime: 60_000,
});
