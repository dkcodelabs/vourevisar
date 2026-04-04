import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mergeService } from '@/services/mergeService';
import type { SubjectMerge, TopicMerge } from '@/types/merges';

export const useMergeData = () => {
  const { user } = useAuth();
  const [subjectMerges, setSubjectMerges] = useState<SubjectMerge[]>([]);
  const [topicMerges, setTopicMerges] = useState<TopicMerge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMerges = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [subjects, topics] = await Promise.all([
        mergeService.getActiveSubjectMerges(user.id),
        mergeService.getActiveTopicMerges(user.id)
      ]);
      
      setSubjectMerges(subjects);
      setTopicMerges(topics);
    } catch (err) {
      console.error('[useMergeData] Erro ao buscar merges:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMerges();
  }, [fetchMerges]);

  useEffect(() => {
    const handler = () => fetchMerges();
    window.addEventListener('mergeUpdated', handler);
    window.addEventListener('cycleUpdated', handler);
    return () => {
      window.removeEventListener('mergeUpdated', handler);
      window.removeEventListener('cycleUpdated', handler);
    };
  }, [fetchMerges]);

  const subjectNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const merge of subjectMerges) {
      map.set(merge.primary_subject_id, merge.display_name);
      for (const id of merge.merged_subject_ids || []) {
        map.set(id, merge.display_name);
      }
    }
    return map;
  }, [subjectMerges]);

  const topicNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const merge of topicMerges) {
      map.set(merge.primary_topic_id, merge.display_name);
      for (const id of merge.merged_topic_ids || []) {
        map.set(id, merge.display_name);
      }
    }
    return map;
  }, [topicMerges]);

  const getUnifiedSubjectName = useCallback((subjectId: string, originalName: string): string => {
    return subjectNamesMap.get(subjectId) || originalName;
  }, [subjectNamesMap]);

  const getUnifiedTopicName = useCallback((topicId: string, originalName: string): string => {
    return topicNamesMap.get(topicId) || originalName;
  }, [topicNamesMap]);

  const revertSubjectMerge = useCallback(async (mergeId: string) => {
    await mergeService.revertSubjectMerge(mergeId);
    await fetchMerges();
    window.dispatchEvent(new CustomEvent('mergeUpdated'));
  }, [fetchMerges]);

  const revertTopicMerge = useCallback(async (mergeId: string) => {
    await mergeService.revertTopicMerge(mergeId);
    await fetchMerges();
    window.dispatchEvent(new CustomEvent('mergeUpdated'));
  }, [fetchMerges]);

  const isSubjectMerged = useCallback((subjectId: string): boolean => {
    return subjectNamesMap.has(subjectId);
  }, [subjectNamesMap]);

  const isTopicMerged = useCallback((topicId: string): boolean => {
    return topicNamesMap.has(topicId);
  }, [topicNamesMap]);

  const getSubjectOrigins = useCallback((subjectId: string): string[] => {
    const origins: string[] = [];
    for (const merge of subjectMerges) {
      if (merge.primary_subject_id === subjectId || merge.merged_subject_ids?.includes(subjectId)) {
        const mergeSubjectIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
        for (const sid of mergeSubjectIds) {
          if (!origins.includes(sid)) origins.push(sid);
        }
      }
    }
    return origins;
  }, [subjectMerges]);

  const getSubjectMergeInfo = useCallback((subjectId: string): SubjectMerge | undefined => {
    return subjectMerges.find(m => 
      m.primary_subject_id === subjectId || m.merged_subject_ids?.includes(subjectId)
    );
  }, [subjectMerges]);

  const getTopicMergeInfo = useCallback((topicId: string): TopicMerge | undefined => {
    return topicMerges.find(m => 
      m.primary_topic_id === topicId || m.merged_topic_ids?.includes(topicId)
    );
  }, [topicMerges]);

  return {
    subjectMerges,
    topicMerges,
    isLoading,
    getUnifiedSubjectName,
    getUnifiedTopicName,
    revertSubjectMerge,
    revertTopicMerge,
    isSubjectMerged,
    isTopicMerged,
    getSubjectOrigins,
    getSubjectMergeInfo,
    getTopicMergeInfo,
    refresh: fetchMerges
  };
};
