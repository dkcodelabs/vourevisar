import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mergeService } from '@/services/mergeService';
import type { SubjectMerge, TopicMerge } from '@/types/merges';
import type { CycleUnificationMap, UnifiedSubjectMapping, UnifiedTopicMapping } from '@/types/cycleMergeTypes';

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

  const dynamicUnificationMap = useMemo((): CycleUnificationMap | null => {
    if (subjectMerges.length === 0) return null;

    const unifiedSubjects: UnifiedSubjectMapping[] = subjectMerges.map(sm => {
      const relatedTopics = topicMerges.filter(tm => tm.subject_merge_id === sm.id);
      
      const topicMappings: UnifiedTopicMapping[] = relatedTopics.map(tm => ({
        displayName: tm.display_name,
        originalTopicIds: [tm.primary_topic_id, ...(tm.merged_topic_ids || [])],
        originalSubjectIds: [sm.primary_subject_id, ...(sm.merged_subject_ids || [])],
        matchType: 'exact',
        sourceEditalIds: []
      }));

      return {
        displayName: sm.display_name,
        originalSubjectIds: [sm.primary_subject_id, ...(sm.merged_subject_ids || [])],
        matchType: 'exact',
        topicMappings,
        sourceEditalIds: []
      };
    });

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      editalIds: [],
      unifiedSubjects,
      standaloneSubjectIds: []
    };
  }, [subjectMerges, topicMerges]);

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
    window.dispatchEvent(new CustomEvent('subjectUpdated'));
  }, [fetchMerges]);

  const revertTopicMerge = useCallback(async (mergeId: string) => {
    await mergeService.revertTopicMerge(mergeId);
    await fetchMerges();
    window.dispatchEvent(new CustomEvent('mergeUpdated'));
    window.dispatchEvent(new CustomEvent('subjectUpdated'));
  }, [fetchMerges]);

  const isSubjectMerged = useCallback((subjectId: string): boolean => {
    for (const merge of subjectMerges) {
      const allIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
      if (!allIds.includes(subjectId)) continue;
      if (allIds.length < 2) continue;
      return true;
    }
    return false;
  }, [subjectMerges]);

  const isTopicMerged = useCallback((topicId: string): boolean => {
    for (const merge of topicMerges) {
      const allIds = [merge.primary_topic_id, ...(merge.merged_topic_ids || [])];
      if (!allIds.includes(topicId)) continue;
      if (allIds.length < 2) continue;
      return true;
    }
    return false;
  }, [topicMerges]);

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
    dynamicUnificationMap,
    refresh: fetchMerges
  };
};
