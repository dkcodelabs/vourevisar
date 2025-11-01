
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay } from 'date-fns';

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
    
    // Listener para mudanças de dados vindas de outras páginas
    const handleDataUpdate = (event?: CustomEvent) => {
      // Evento recebido, recarregando dados
      refetch();
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('topicUpdated', handleDataUpdate);
    window.addEventListener('subjectUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('topicUpdated', handleDataUpdate);
      window.removeEventListener('subjectUpdated', handleDataUpdate);
    };
  }, [refetch]);

  const resetFilters = () => {
    setSelectedDate(undefined);
    setViewMode('all');
    setSearchTerm('');
  };

  // CORREÇÃO: Usar comparação de strings de data para evitar problemas de timezone
  const todayDateString = format(startOfDay(new Date()), 'yyyy-MM-dd');
  
  // Log removido para otimização

  // Otimização: classificar tópicos em uma única iteração
  const { delayedTopics, todayTopics, futureTopics, completedTopics } = filteredTopics.reduce(
    (acc, topic) => {
      if (topic.completed || topic.review_stage === 'Concluído') {
        acc.completedTopics.push(topic);
        return acc;
      }

      if (!topic.next_review) return acc;

      const reviewDateString = format(startOfDay(new Date(topic.next_review)), 'yyyy-MM-dd');
      
      if (reviewDateString < todayDateString) {
        acc.delayedTopics.push(topic);
      } else if (reviewDateString === todayDateString) {
        acc.todayTopics.push(topic);
      } else {
        acc.futureTopics.push(topic);
      }

      return acc;
    },
    {
      delayedTopics: [] as Topic[],
      todayTopics: [] as Topic[],
      futureTopics: [] as Topic[],
      completedTopics: [] as Topic[]
    }
  );

  // Log removido para otimização

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
