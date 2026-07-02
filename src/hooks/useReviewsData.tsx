
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay } from 'date-fns';
import { SRS_THRESHOLDS, LearningStatus } from '@/utils/calculateNextReview';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { mergeService } from '@/services/mergeService';
import { dedupeMergedReviewTopics, expandReviewSubjectScope } from '@/utils/reviewMergeScope';

export interface ReviewTopic {
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
  difficulty_level?: number;
  memory_stability?: number;
  current_interval?: number;
  learningStatus?: LearningStatus;
}

// Interface for export group
export interface GroupedTopicStats {
  learningStatus: LearningStatus;
  count: number;
}

// Helper: Calculate Risk Score
const calculateRiskScore = (topic: ReviewTopic): number => {
  const today = new Date();
  const dueDate = topic.next_review ? new Date(topic.next_review) : today;

  // 1. Days Overdue (Weight: 3.0)
  const diffTime = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // 2. Difficulty (Weight: 2.0)
  const difficulty = topic.difficulty_level || 1; // Default to 1 if not set

  // 3. Study Gap (Weight: 0.5)
  // Time since last interaction (review or first study)
  const lastContactDate = topic.last_reviewed_at
    ? new Date(topic.last_reviewed_at)
    : (topic.first_studied_at ? new Date(topic.first_studied_at) : today);

  const gapTime = today.getTime() - lastContactDate.getTime();
  const studyGapDays = Math.max(0, Math.ceil(gapTime / (1000 * 60 * 60 * 24)));

  // Formula
  return (daysOverdue * 3.0) + (difficulty * 2.0) + (studyGapDays * 0.5);
};

export const determineLearningStatus = (stability: number, interval: number, reviewCount: number): LearningStatus => {
  if (reviewCount < SRS_THRESHOLDS.MIN_CONSISTENCY || stability < SRS_THRESHOLDS.STABILITY_LOW) {
    return 'Aprendendo';
  }
  if (stability >= SRS_THRESHOLDS.STABILITY_MID && interval >= SRS_THRESHOLDS.INTERVAL_LONG && reviewCount >= SRS_THRESHOLDS.MIN_CONSISTENCY) {
    return 'Dominando';
  }
  // Se não for nem frágil demais nem totalmente maduro:
  return 'Fixando';
};

export const useReviewsData = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<ReviewTopic[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'all' | 'date'>('all');

  // Recovery Mode State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<'ABSENCE' | 'BACKLOG' | null>(null);

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ['topics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // 1. Buscar ciclo e merges ativos para montar o mesmo escopo visual da página Ciclo.
      const [{ data: cycleData }, subjectMerges, topicMerges] = await Promise.all([
        supabase
          .from('user_cycles')
          .select('ciclo_atual')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        mergeService.getActiveSubjectMerges(user.id),
        mergeService.getActiveTopicMerges(user.id),
      ]);

      const activeSubjectIds = cycleData?.ciclo_atual || [];

      if (activeSubjectIds.length === 0) {
        return []; // Se não tem ciclo ativo, não tem revisões
      }

      const reviewSubjectIds = expandReviewSubjectScope(activeSubjectIds, subjectMerges);

      // 2. Buscar tópicos das matérias do ciclo, incluindo matérias equivalentes unificadas.
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
          memory_stability,
          current_interval,
          notes,
          subjects!inner (
            id,
            name,
            color
          )
        `)
        .eq('subjects.user_id', user.id)
        .in('subject_id', reviewSubjectIds)
        .neq('is_active', false); // Ignora tópicos deletados logicamente

      if (error) throw error;

      const reviewScopedTopics = dedupeMergedReviewTopics(data, topicMerges);

      // Map to existing Topic structure and Sort locally
      const mappedTopics = reviewScopedTopics.map(topic => ({
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
        memory_stability: topic.memory_stability,
        current_interval: topic.current_interval,
        learningStatus: (topic.review_count > 0 || topic.first_studied_at) 
          ? determineLearningStatus(topic.memory_stability || 0, topic.current_interval || 0, topic.review_count || 0) 
          : undefined,
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
        // Listener para eventos globais de atualização
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

      // Check Recovery Mode Criteria
      checkRecoveryMode(topics);
    }
  }, [topics, searchTerm, selectedDate, viewMode]);

  const checkRecoveryMode = (allTopics: ReviewTopic[]) => {
    const today = new Date();
    const todayDateString = format(startOfDay(today), 'yyyy-MM-dd');

    // 1. Check Backlog Size
    const overdueTopics = allTopics.filter(t => {
      if (t.completed || !t.next_review) return false;
      const reviewDate = format(startOfDay(new Date(t.next_review)), 'yyyy-MM-dd');
      return reviewDate < todayDateString;
    });

    if (overdueTopics.length > 20) {
      setIsRecoveryMode(true);
      setRecoveryReason('BACKLOG');
      return;
    }

    // 2. Check Absence (Last review was > 5 days ago)
    // Find the most recent review among all topics
    // NOTE: This checks active topics. If user has NO reviews ever, it's not recovery, it's onboarding.
    const reviewedTopics = allTopics.filter(t => t.last_reviewed_at);
    if (reviewedTopics.length > 0) {
      const lastReviewDates = reviewedTopics.map(t => new Date(t.last_reviewed_at!).getTime());
      const maxReviewDate = Math.max(...lastReviewDates);
      const daysSinceLastReview = (today.getTime() - maxReviewDate) / (1000 * 60 * 60 * 24);

      if (daysSinceLastReview > 5) {
        setIsRecoveryMode(true);
        setRecoveryReason('ABSENCE');
        return;
      }
    }

    setIsRecoveryMode(false);
    setRecoveryReason(null);
  };

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

  const { delayedTopics, todayTopics, futureTopics, completedTopics, consolidatedTopics, totalPendingCount } = filteredTopics.reduce(
    (acc, topic) => {
      // Estabilidade alta pode indicar "Dominando", mas não encerra o programa.
      if (isReviewProgramCompleted(topic)) {
        acc.consolidatedTopics.push(topic);
        return acc;
      }

      if (!topic.next_review) return acc;

      const reviewDateString = format(startOfDay(new Date(topic.next_review)), 'yyyy-MM-dd');

      if (reviewDateString < todayDateString) {
        acc.delayedTopics.push(topic);
        acc.totalPendingCount++;
      } else if (reviewDateString === todayDateString) {
        acc.todayTopics.push(topic);
        acc.totalPendingCount++;
      } else {
        acc.futureTopics.push(topic);
        if (!isRecoveryMode) acc.totalPendingCount++; // In recovery, we might treat future differently in total counts? 
        // Plan says: "Cards do topo NÃO devem ser redesenhados... Mostram realidade completa". 
        // So pending count should probably reflect TRUTH, not just recovery slice.
        // Let's keep it true total.
      }

      return acc;
    },
    {
      delayedTopics: [] as ReviewTopic[],
      todayTopics: [] as ReviewTopic[],
      futureTopics: [] as ReviewTopic[],
      completedTopics: [] as ReviewTopic[],
      consolidatedTopics: [] as ReviewTopic[],
      totalPendingCount: 0
    }
  );

  // Calculation based strictly on reality (or the capped slice from Recovery Mode)

  // Apply Recovery Mode Logic to 'todayTopics' (which usually merges delayed + today)
  // But wait, the hook returns separate arrays. The UI merges them for 'FOCUS' tab.
  // We should prepare the "Recovery List" here or let the UI handle it?
  // The plan says: "Execute Slice... The 'Today' view should show only 7 reviews".

  // Let's optimize the exported arrays.
  // If Recovery Mode:
  // 1. Identify TOP candidates from (Delayed + Today).
  // 2. Sort them by Risk Score.
  // 3. Slice top 7.
  // 4. Return these as `todayTopics` (or a specific recovery list) to force focus.
  // BUT we must preserve `delayedTopics` array size for the Header Stats (which must show full count).

  // So we will return a NEW property `recoveryTopics` or modify `todayTopics`?
  // Modifying `todayTopics` might be confusing if `delayedTopics` is still full.
  // The UI `Revisoes.tsx` calculates `stats` based on `delayedTopics.length`. 
  // If we slice `delayedTopics` here, we break the stats.

  // STRATEGY: 
  // Return the full arrays (for stats).
  // Return a `visibleTopics` or `prioritizedTopics` array that handles the slicing.
  // OR, simpler: The UI component `RevisoesList` uses `items` derived from `useReviewsData`.
  // We can perform the sorting/slicing in `Revisoes.tsx` inside `useMemo` based on `isRecoveryMode` flag.
  // However, putting logic in the hook is cleaner.

  // Let's Attach Risk Score to topics and sort delayed/today by it.

  // Sort Delayed and Today by Risk Score Descending
  delayedTopics.sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));
  todayTopics.sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));

  let focusTopics = [...delayedTopics, ...todayTopics];

  // Sort by Risk Score regardless of mode (User wants "Hoje" => "Sugerida pelo Risk Score")
  focusTopics.sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));

  // Apply Cap if Recovery Mode
  if (isRecoveryMode) {
    focusTopics = focusTopics.slice(0, 7);
  }

  const suggestedDailyReviews = focusTopics.length;

  return {
    allTopics: topics || [],
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
    completedTopics,
    consolidatedTopics,
    // New Recovery Props
    isRecoveryMode,
    recoveryReason,
    totalPendingCount,
    suggestedDailyReviews,
    focusTopics // Exported
  };
};
