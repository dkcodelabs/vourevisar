import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useDailySubjectsWithViews } from '@/hooks/useDailySubjectsWithViews';
import { useMergeData } from '@/hooks/useMergeData';
import { registerDualProgress } from '@/services/cycleMergeService';
import { SubjectStatus, ReviewInterval } from '@/types/study-cycle';
import { cleanCycle } from '@/utils/cycleUtils';
import { mapDifficultyLevel, mapDifficultyToNumericLevel } from '@/utils/topicDifficulty';
import type { StudyCycleSubject, StudyCycleTopic } from '@/types/study-cycle';
import type { Subject, Topic, UserCycle, UserEdital } from '@/types';
import {
  getSubjectExplorationPercentage,
  getSubjectStrategicWeight,
  getTopicStrategicIncidence,
} from '@/utils/studyCycleStrategic';

import { fetchTopicReviewStats } from '@/services/topicReviewService';

const STUDY_FOCUS_COUNT = 2;

// Mapping functions
const mapStatusToStudyCycleStatus = (status: string): SubjectStatus => {
  switch (status) {
    case 'Nova':
    case 'Em Estudo':
      return SubjectStatus.ACTIVE;
    case 'Concluída':
      return SubjectStatus.FINISHED;
    default:
      return SubjectStatus.ACTIVE;
  }
};

const mapReviewStageToInterval = (reviewStage?: string, completed?: boolean, reviewCount?: number, firstStudiedAt?: string | null | Date): ReviewInterval => {
  if (completed || reviewStage === 'Concluído') return ReviewInterval.COMPLETED;

  if (reviewStage) {
    switch (reviewStage) {
      case 'Primeiro Contato':
        return ReviewInterval.FIRST_CONTACT;
      case '24h':
      case '1d':
        return ReviewInterval.REVISED_24H;
      case '3d':
      case '7 dias':
      case '7d':
        return ReviewInterval.REVISED_7D;
      case '15 dias':
      case '15d':
        return ReviewInterval.REVISED_15D;
      case '30 dias':
      case '30d':
        return ReviewInterval.REVISED_30D;
      case '60d':
        return ReviewInterval.REVISED_30D;
    }
  }

  if ((reviewCount && reviewCount > 0) || firstStudiedAt) {
    return ReviewInterval.FIRST_CONTACT; // Fallback se já foi estudado mas não tem estágio definido
  }

  return ReviewInterval.NOT_STARTED;
};

const mapTopicToStudyCycleTopic = (topic: Topic): StudyCycleTopic => {
  const nextReviewRaw = topic.next_review;
  const lastReviewedAtRaw = topic.last_reviewed_at;
  const reviewStageRaw = topic.review_stage || topic.reviewStage;

  const reviewStatusComputed = mapReviewStageToInterval(
    reviewStageRaw, 
    topic.completed, 
    topic.reviewCount || topic.review_count, 
    topic.first_studied_at || topic.firstStudiedAt
  );

  return {
    id: topic.id,
    name: topic.name,
    reviewStatus: reviewStatusComputed,
    nextReviewDate: nextReviewRaw || undefined,
    lastReviewedAt: lastReviewedAtRaw || undefined,
    notes: topic.notes?.content || '',
    difficulty: mapDifficultyLevel(topic.difficulty_level),
    subTopics: topic.subtopics?.map(st => ({ id: st.id, name: st.name })) || [],
    createdAt: topic.created_at,
    position: topic.position,
    reviewCount: topic.reviewCount ?? topic.review_count ?? 0,
    totalVolume: topic.total_volume ?? null,
    incidenceLevel: topic.incidence_level ?? null,
    lastSearchContext: topic.last_search_context ?? null,
    strategicIncidence: getTopicStrategicIncidence({
      totalVolume: topic.total_volume ?? null
    })
  };
};

const mapSubjectToStudyCycleSubject = (subject: Subject): StudyCycleSubject => {
  const mappedTopics = subject.topics.map(mapTopicToStudyCycleTopic);
  const isFullyCompleted = mappedTopics.length > 0 && mappedTopics.every(topic => topic.reviewStatus === ReviewInterval.COMPLETED);

  return {
    id: subject.id,
    name: subject.name,
    topics: mappedTopics,
    status: isFullyCompleted ? SubjectStatus.FINISHED : mapStatusToStudyCycleStatus(subject.status),
    exam_weight_points: subject.exam_weight_points ?? null,
    exam_weight_questions: subject.exam_weight_questions ?? null,
    exam_weight_percentage: subject.exam_weight_percentage ?? null,
    exam_weight_raw: subject.exam_weight_raw ?? null,
    strategicWeight: getSubjectStrategicWeight({
      exam_weight_points: subject.exam_weight_points ?? null,
      exam_weight_questions: subject.exam_weight_questions ?? null,
      exam_weight_percentage: subject.exam_weight_percentage ?? null,
      exam_weight_raw: subject.exam_weight_raw ?? null,
    }),
    explorationPercentage: getSubjectExplorationPercentage(mappedTopics)
  };
};

export const useStudyCycleData = () => {
  const { user } = useAuth();
  const [isSubjectsLoaded, setIsSubjectsLoaded] = useState(false);
  const [isCycleLoaded, setIsCycleLoaded] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userEditais, setUserEditais] = useState<UserEdital[]>([]);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);

  const { markTopicAsReviewed } = useTopicReview();
  const { getUnifiedSubjectName, getUnifiedTopicName } = useMergeData();

  const isLoading = useMemo(() => {
    // If no user, it's not loading (nothing to load)
    if (!user) return false;
    return !(isSubjectsLoaded && isCycleLoaded);
  }, [user, isSubjectsLoaded, isCycleLoaded]);

  // Safety timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isSubjectsLoaded || !isCycleLoaded) {
        console.warn('⚠️ Force stopping loading state after timeout', { isSubjectsLoaded, isCycleLoaded });
        setIsSubjectsLoaded(true);
        setIsCycleLoaded(true);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [isSubjectsLoaded, isCycleLoaded]);

  const loadSubjects = useCallback(async () => {
    if (!user) return;

    try {
      const cacheKey = `subjects_cache_${user.id}_v3`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjects(parsed);
            setIsSubjectsLoaded(true);
          }
        } catch (e) {
          console.error('Invalid subjects cache', e);
        }
      }

      // Executa as buscas em paralelo para evitar race conditions
      const [subjectsRes, editaisRes] = await Promise.all([
        supabase
          .from('subjects')
          .select(`*, topics (*, difficulty_level, review_stage, completed, notes, updated_at, next_review, last_reviewed_at, position, total_volume, incidence_level, last_search_context)`)
          .eq('user_id', user.id)
          .eq('topics.is_active', true)
          .order('priority', { ascending: true })
          .order('position', { foreignTable: 'topics', ascending: true })
          .order('created_at', { foreignTable: 'topics', ascending: true }),
        (supabase as unknown)
          .from('user_editais')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (subjectsRes.error) {
        console.error('Erro ao carregar matérias:', subjectsRes.error);
        return;
      }

      const newSubjects = (subjectsRes.data as unknown) || [];
      setSubjects(newSubjects);
      localStorage.setItem(cacheKey, JSON.stringify(newSubjects));
      setIsSubjectsLoaded(true);

      if (editaisRes.error) {
        console.error('Erro ao carregar editais:', editaisRes.error);
      } else {
        setUserEditais((editaisRes.data || []) as UserEdital[]);
      }
    } catch (error) {
      console.error('Erro ao carregar matérias:', error);
    }
  }, [user]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const updateTopic = useCallback(async (topicId: string, updates: unknown) => {
    try {
      await supabase.from('topics').update(updates).eq('id', topicId);
      await loadSubjects();
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
    }
  }, [loadSubjects]);

  const refreshData = useCallback(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Event listener para atualizações globais de matérias/editais
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 StudyCycleData: Global update received, refreshing...');
      refreshData();
    };

    window.addEventListener('subjectStatusUpdated', handleUpdate);
    window.addEventListener('subjectUpdated', handleUpdate);
    window.addEventListener('cycleUpdated', handleUpdate);
    window.addEventListener('mergeUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('subjectStatusUpdated', handleUpdate);
      window.removeEventListener('subjectUpdated', handleUpdate);
      window.removeEventListener('cycleUpdated', handleUpdate);
      window.removeEventListener('mergeUpdated', handleUpdate);
    };
  }, [refreshData]);

  // Load user cycle data
  useEffect(() => {
    const loadUserCycle = async () => {
      const cycleCacheKey = `user_cycle_cache_${user.id}`;
      const subjectsCacheKey = `subjects_cache_${user.id}_v2`;

      try {
        const { data, error } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);

        if (error) {
          console.error('Erro ao carregar ciclo:', error);
          return;
        }

        let cycleData = (data?.[0] as unknown as UserCycle) || null;

        // Se não há ciclo no BD ou ciclo_atual está vazio, garantir que seja null/array vazio
        if (!cycleData || !cycleData.ciclo_atual || cycleData.ciclo_atual.length === 0) {
          cycleData = null;
          // Limpar cache local quando não há ciclo
          localStorage.removeItem(cycleCacheKey);
        } else {
          // Só salvar cache quando há ciclo ativo com matérias
          localStorage.setItem(cycleCacheKey, JSON.stringify(cycleData));
        }

        setUserCycle(cycleData);
      } catch (error) {
        console.error('Erro ao carregar ciclo:', error);
        // Fallback: tentar usar cache apenas se ciclo existir no BD (verificado acima)
        const cycleCached = localStorage.getItem(cycleCacheKey);
        if (cycleCached) {
          try {
            const parsed = JSON.parse(cycleCached);
            if (parsed && parsed.ciclo_atual && parsed.ciclo_atual.length > 0) {
              setUserCycle(parsed);
            }
          } catch (e) {
            console.error('Invalid cycle cache', e);
          }
        }
      } finally {
        setIsCycleLoaded(true);
      }
    };

    loadUserCycle();
  }, [user]);

  // A re-injeção automática de matérias foi removida para evitar o problema de "matérias fantasmas".
  // A inclusão de matérias no ciclo agora é feita de forma explícita durante a mesclagem de editais
  // ou através da tela de Matérias/Ciclo.

  const dailySubjectsWithViews = useDailySubjectsWithViews(subjects, userCycle);

  const unifiedSubjects = useMemo(() => {
    if (subjects.length === 0) return [];
    return subjects.map(subject => ({
      ...subject,
      name: getUnifiedSubjectName(subject.id, subject.name)
    }));
  }, [subjects, getUnifiedSubjectName]);

  const [topicReviewStats, setTopicReviewStats] = useState<Map<string, { reviewCount: number; hardReviewCount: number }>>(new Map());

  const studyCycleSubjectsMemo = useMemo(() => {
    if (subjects.length === 0) {
      return [];
    }
    if (!userCycle?.ciclo_atual || userCycle.ciclo_atual.length === 0) {
      return [];
    }

    const cycleSubjects: StudyCycleSubject[] = [];
    userCycle.ciclo_atual.forEach((subjectId, index) => {
      const subject = unifiedSubjects.find(s => s.id === subjectId);
      
      if (!subject) {
        return;
      }

      try {
        const studyCycleSubject = mapSubjectToStudyCycleSubject(subject);
        const isStudiedInCycle = userCycle.materias_estudadas_ciclo?.includes(subject.id);
        if (isStudiedInCycle && studyCycleSubject.status !== SubjectStatus.FINISHED) {
          studyCycleSubject.status = SubjectStatus.COMPLETED_CYCLE;
        }

        studyCycleSubject.id = subject.id; // ID puro, sem sufixo de view
        studyCycleSubject.originalId = subject.id;
        studyCycleSubject.cyclePosition = index + 1;

        cycleSubjects.push(studyCycleSubject);
      } catch (error) {
        console.error('Erro ao mapear matéria:', error, subject);
      }
    });

    const completedSubjects = subjects.filter(subject => {
      if (userCycle.ciclo_atual.includes(subject.id)) return false;
      const mappedTopics = subject.topics.map(t => ({
        ...t,
        name: getUnifiedTopicName(t.id, t.name)
      }));
      return mappedTopics.length > 0 && mappedTopics.every(topic => topic.review_stage === 'Concluído');
    });

    completedSubjects.forEach(subject => {
      try {
        const unifiedSubject = {
          ...subject,
          name: getUnifiedSubjectName(subject.id, subject.name)
        };
        const studyCycleSubject = mapSubjectToStudyCycleSubject(unifiedSubject);
        studyCycleSubject.originalId = subject.id;
        cycleSubjects.push(studyCycleSubject);
      } catch (error) {
        console.error('Erro ao mapear matéria concluída:', error, subject);
      }
    });

    return cycleSubjects;
  }, [getUnifiedSubjectName, getUnifiedTopicName, subjects, unifiedSubjects, userCycle]);

  // Busca em lote as estatísticas de revisão (reviewCount + hardReviewCount) ao mudar o conjunto de tópicos
  useEffect(() => {
    const allTopicIds = studyCycleSubjectsMemo.flatMap(s => s.topics.map(t => t.id));
    if (allTopicIds.length === 0) {
      setTopicReviewStats(new Map());
      return;
    }
    fetchTopicReviewStats(allTopicIds).then(setTopicReviewStats);
  }, [studyCycleSubjectsMemo]);

  // Enriquecer tópicos com reviewCount e hardReviewCount
  const studyCycleSubjects = useMemo(() => {
    if (topicReviewStats.size === 0) return studyCycleSubjectsMemo;
    return studyCycleSubjectsMemo.map(subject => ({
      ...subject,
      topics: subject.topics.map(topic => {
        const stats = topicReviewStats.get(topic.id);
        if (!stats) return topic;
        
        // Preserve the original reviewCount from the database topic, which might be higher
        // due to historical migrations or manual edits, but add the hardReviewCount from stats
        const finalReviewCount = Math.max(topic.reviewCount || 0, stats.reviewCount);
        
        return { ...topic, reviewCount: finalReviewCount, hardReviewCount: stats.hardReviewCount };
      })
    }));
  }, [studyCycleSubjectsMemo, topicReviewStats]);

  const groupedSubjects = useMemo(() => {
    return studyCycleSubjects.reduce((acc, subject) => {
      const status = subject.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(subject);
      return acc;
    }, {} as Record<SubjectStatus, StudyCycleSubject[]>);
  }, [studyCycleSubjects]);

  const activeSubjects = groupedSubjects[SubjectStatus.ACTIVE] || [];
  const completedCycleSubjects = groupedSubjects[SubjectStatus.COMPLETED_CYCLE] || [];

  const areAllStudiesCompleted = useMemo(() => {
    if (studyCycleSubjects.length === 0) return false;
    return studyCycleSubjects.every(subject =>
      subject.status === SubjectStatus.FINISHED && subject.topics.every(topic => topic.reviewStatus === ReviewInterval.COMPLETED)
    );
  }, [studyCycleSubjects]);

  const handleStartNewCycle = useCallback(async () => {
    if (!user) return;
    try {
      const subjectsToReset = subjects.filter(s => s.status === 'Concluída');
      for (const subject of subjectsToReset) {
        await supabase.from('subjects').update({ status: 'Em Estudo' }).eq('id', subject.id).eq('user_id', user.id);
      }
      await refreshData();

      await supabase.from('user_cycles').update({
        materias_estudadas_hoje: [],
        data_ultimo_reset: new Date().toISOString().split('T')[0],
        data_inicio_ciclo: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }).eq('user_id', user.id);

      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { isNewCycle: true, timestamp: Date.now() } }));
      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', { detail: { isReset: true, timestamp: Date.now() } }));
    } catch (error) {
      console.error('Error starting new cycle:', error);
    }
  }, [user, subjects, refreshData]);

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    try {
      await refreshData();
      if (user) {
        const { data } = await supabase.from('user_cycles').select('*').eq('user_id', user.id).eq('status', 'active').limit(1);
        if (data && data.length > 0) setUserCycle(data[0] as unknown as UserCycle);
      }
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { subjectId, completed: true } }));
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }, [refreshData, user]);

  const handleSaveNotes = useCallback(async (subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    try {
      const updatePayload: unknown = {};
      if (updatedData.notes !== undefined) updatePayload.notes = { content: updatedData.notes };
      if (updatedData.difficulty !== undefined) {
        updatePayload.difficulty_level = mapDifficultyToNumericLevel(updatedData.difficulty);
        updatePayload.difficulty_set_at = new Date();
      }
      if (updatedData.subTopics !== undefined) updatePayload.subtopics = updatedData.subTopics;

      await updateTopic(topicId, updatePayload);

      // 🔄 Propagação profunda v2.2: Replicar notas/dificuldade/subtópicos para irmãos
      try {
        const unificationMap = userCycle?.unification_map ?? null;
        await registerDualProgress(topicId, updatePayload, unificationMap);
      } catch (dualErr) {
        console.warn('⚠️ Falha na propagação de notas para irmãos (não-bloqueante):', dualErr);
      }

      await refreshData();
    } catch (error) {
      console.error('Error saving topic notes:', error);
      throw error;
    }
  }, [updateTopic, refreshData, userCycle]);

  const refreshCycleData = useCallback(async () => {
    if (!user) return;
    try {
      await refreshData();
      const { data } = await supabase.from('user_cycles').select('*').eq('user_id', user.id).eq('status', 'active').limit(1);
      setUserCycle((data?.[0] as unknown as UserCycle) || null);
    } catch (error) {
      console.error('Erro ao recarregar ciclo:', error);
    }
  }, [user, refreshData]);

  return {
    studyCycleSubjects,
    groupedSubjects,
    activeSubjects,
    completedCycleSubjects,
    areAllStudiesCompleted,
    userCycle,
    dailySubjectsWithViews,
    handleStartNewCycle,
    handleCompleteSession,
    handleSaveNotes,
    refreshCycleData,
    isLoading
  };
};

const reviewProgression: ReviewInterval[] = [
  ReviewInterval.NOT_STARTED,
  ReviewInterval.REVISED_24H,
  ReviewInterval.REVISED_7D,
  ReviewInterval.REVISED_15D,
  ReviewInterval.REVISED_30D,
  ReviewInterval.COMPLETED
];

export const getNextReviewInterval = (currentStatus: ReviewInterval): ReviewInterval => {
  const currentIndex = reviewProgression.indexOf(currentStatus);
  return (currentIndex === -1 || currentIndex === reviewProgression.length - 1) ? currentStatus : reviewProgression[currentIndex + 1];
};
