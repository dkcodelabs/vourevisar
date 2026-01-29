
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
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Replace RPC with direct query to ensure ALL topics are returned (including completed)
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
          difficulty_level,
          notes,
          subjects!inner (
            id,
            name,
            color
          )
        `)
        .eq('subjects.user_id', user.id);

      if (error) throw error;

      // Map to existing Topic structure and Sort locally
      const mappedTopics = (data as any[]).map(topic => ({
        id: topic.id,
        name: topic.name,
        subject_id: topic.subject_id,
        review_stage: topic.review_stage,
        next_review: topic.next_review,
        review_count: topic.review_count ?? 0,
        first_studied_at: topic.first_studied_at,
        last_reviewed_at: topic.last_reviewed_at,
        completed: topic.completed ?? false,
        difficulty_level: topic.difficulty_level,
        notes: topic.notes,
        subject_name: topic.subjects?.name || 'Sem disciplina',
        subjects: {
          id: topic.subjects?.id,
          name: topic.subjects?.name,
          color: topic.subjects?.color,
          user_id: user.id
        }
      }));

      // Sort logic: 
      // 1. Pending (Overdue < Today < Future)
      // 2. Completed last (or by date?) 
      // Existing logic used weighted sort. We will approximate reasonable sort:
      // Status (Pending > Completed) -> Next Review (Asc)

      mappedTopics.sort((a, b) => {
        // Completed last
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;

        // Next Review date comparison
        const dateA = a.next_review ? new Date(a.next_review).getTime() : Infinity;
        const dateB = b.next_review ? new Date(b.next_review).getTime() : Infinity;

        return dateA - dateB;
      });

      return mappedTopics;
    },
    enabled: !!user?.id
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

  // Otimização: classificar tópicos em uma única iteração
  // NOTA: A ordenação principal já vem do banco (R1/R2 -> Difícil -> Data)
  // O reduce aqui apenas agrupa para visualização, mas a ordem dentro de 'delayedTopics' e 'todayTopics' 
  // será preservada conforme veio do banco, mantendo a prioridade desejada.
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
