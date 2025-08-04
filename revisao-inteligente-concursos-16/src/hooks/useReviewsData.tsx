
import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay } from 'date-fns';
import { useOptimizedReviews } from './useOptimizedQueries';
import { useMemoizedTopicFilters } from './useMemoizedCalculations';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'all' | 'date'>('all');

  // Usar query otimizada
  const { data: topics = [], isLoading, error, refetch } = useOptimizedReviews();

  // Filtros memoizados
  const filteredTopics = useMemo(() => {
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

    return filtered;
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

  // Usar filtros memoizados
  const { delayed: delayedTopics, today: todayTopics, future: futureTopics, completed: completedTopics } = 
    useMemoizedTopicFilters(filteredTopics);

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
