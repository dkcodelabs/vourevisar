
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export const useSubjectsAndTopics = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;

  const fetchSubjects = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Erro ao buscar matérias:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSubjects();
    }
  }, [fetchSubjects, userId]);

  const fetchTopicsBySubject = async (subjectId: string) => {
    try {
      const queryResult = await (supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .eq('is_active', true)
        .order('name') as unknown);
      const { data, error } = queryResult as { data: Topic[] | null, error: unknown };
      
      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Erro ao buscar tópicos:', error);
      setTopics([]);
    }
  };

  return {
    subjects,
    topics,
    isLoading,
    fetchTopicsBySubject
  };
};
