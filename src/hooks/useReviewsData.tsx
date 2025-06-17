
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  review_stage: string;
  next_review: string | null;
  review_count: number;
  first_studied_at: string | null;
  last_reviewed_at: string | null;
  completed: boolean;
  subjects?: {
    id: string;
    name: string;
    color: string;
  };
}

export const useReviewsData = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'all' | 'date'>('all');

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          subject_id,
          review_stage,
          next_review,
          review_count,
          first_studied_at,
          last_reviewed_at,
          completed,
          subjects (
            id,
            name,
            color,
            user_id
          )
        `)
        .order('next_review', { ascending: true });

      if (error) throw error;

      const filtered = data.filter(topic => topic.subjects?.user_id === user?.id);

      return filtered.map(topic => ({
        ...topic,
        review_count: topic.review_count ?? 0,
        completed: topic.completed ?? false,
        subject_name: topic.subjects?.name || 'Sem disciplina'
      }));
    }
  });

  useEffect(() => {
    if (topics) {
      let filtered = topics;

      if (viewMode === 'date' && selectedDate) {
        const selectedDateString = format(startOfDay(selectedDate), 'yyyy-MM-dd');
        filtered = topics.filter(topic => {
          if (!topic.next_review) return false;
          const reviewDateString = format(startOfDay(new Date(topic.next_review)), 'yyyy-MM-dd');
          return reviewDateString === selectedDateString;
        });
      }

      if (searchTerm.trim() !== '') {
        filtered = filtered.filter(topic =>
          topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          topic.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setFilteredTopics(filtered);
    }
  }, [topics, searchTerm, selectedDate, viewMode]);

  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  const resetFilters = () => {
    setSelectedDate(undefined);
    setViewMode('all');
    setSearchTerm('');
  };

  // Calculate topic categories - CORRIGIDO para usar completed
  const hoje = startOfDay(new Date());
  const delayedTopics = filteredTopics.filter(t => 
    !t.completed && 
    t.review_stage !== 'Concluído' && 
    t.next_review && 
    isBefore(startOfDay(new Date(t.next_review)), hoje)
  );
  
  const todayTopics = filteredTopics.filter(t => 
    !t.completed && 
    t.review_stage !== 'Concluído' && 
    t.next_review && 
    startOfDay(new Date(t.next_review)).getTime() === hoje.getTime()
  );
  
  const futureTopics = filteredTopics.filter(t => 
    !t.completed && 
    t.review_stage !== 'Concluído' && 
    t.next_review && 
    new Date(t.next_review) > hoje && 
    startOfDay(new Date(t.next_review)).getTime() !== hoje.getTime()
  );
  
  const completedTopics = filteredTopics.filter(t => 
    t.completed || t.review_stage === 'Concluído'
  );

  return {
    topics: filteredTopics,
    isLoading,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    resetFilters,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics
  };
};
