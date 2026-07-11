import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { fetchTopicReviewStats, fetchTopicReviewStudyMinutes } from '@/services/topicReviewService';
import type { UserCycle, Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { CycleStudyEventType } from '@/services/cycleStudyEventsService';
import { useCycleStudyEventRecorder } from '@/hooks/useCycleStudyEventRecorder';
import type { CycleStudyEvent } from '@/utils/studyCycleEventInsights';

type CycleSubjectSnapshot = {
  subject_id: string;
  subject_name: string;
  total_topics: number;
  topics_started: number;
  topics_completed: number;
  studied_in_cycle: boolean;
  manually_marked_in_cycle?: boolean;
  all_topics_started?: boolean;
  completed_in_edital?: boolean;
  closed_in_cycle?: boolean;
};

export type CycleRotationSnapshot = {
  id: string;
  user_id: string;
  user_cycle_id: string;
  cycle_number: number;
  started_at: string | null;
  completed_at: string;
  subject_count: number;
  studied_subject_count: number;
  topics_started_count: number;
  topics_completed_count: number;
  studied_subject_ids: string[];
  cycle_subject_ids: string[];
  edital_ids: string[];
  per_subject: CycleSubjectSnapshot[];
  created_at: string;
};

type DifficultyModalData = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  reviewCount: number;
  reviewStage: string | null;
  duration?: number;
};

type UseSubjectsCycleRuntimeInput = {
  difficultyModalData: DifficultyModalData;
  dynamicUnificationMap: CycleUnificationMap;
  localSubjects: Subject[];
  subjects: Subject[];
  user: { id: string } | null;
  userCycle: UserCycle | null;
  visibleCycleTopicIds: string[];
};

export function useSubjectsCycleRuntime({
  difficultyModalData,
  dynamicUnificationMap,
  localSubjects,
  subjects,
  user,
  userCycle,
  visibleCycleTopicIds,
}: UseSubjectsCycleRuntimeInput) {
  const [topicStats, setTopicStats] = useState<Map<string, { reviewCount: number; hardReviewCount: number }>>(new Map());
  const [topicStudyMinutes, setTopicStudyMinutes] = useState<Map<string, number>>(new Map());
  const [cycleSnapshots, setCycleSnapshots] = useState<CycleRotationSnapshot[]>([]);
  const [cycleStudyEvents, setCycleStudyEvents] = useState<CycleStudyEvent[]>([]);

  useEffect(() => {
    const allTopicIds = subjects.flatMap((subject) => subject.topics.map((topic) => topic.id));
    if (allTopicIds.length === 0) {
      setTopicStats(new Map());
      return;
    }

    fetchTopicReviewStats(allTopicIds).then((stats) => {
      setTopicStats(stats);
    });
  }, [subjects]);

  useEffect(() => {
    if (visibleCycleTopicIds.length === 0) {
      setTopicStudyMinutes(new Map());
      return;
    }

    fetchTopicReviewStudyMinutes(visibleCycleTopicIds).then((studyMinutes) => {
      setTopicStudyMinutes(studyMinutes);
    });
  }, [visibleCycleTopicIds]);

  const loadCycleSnapshots = useCallback(async () => {
    if (!user || !userCycle?.id) {
      setCycleSnapshots([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cycle_rotation_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_cycle_id', userCycle.id)
        .order('cycle_number', { ascending: false })
        .limit(6);

      if (error) throw error;
      setCycleSnapshots((data || []) as CycleRotationSnapshot[]);
    } catch (error) {
      console.warn('Histórico de ciclos indisponível:', error);
      setCycleSnapshots([]);
    }
  }, [user, userCycle?.id]);

  useEffect(() => {
    void loadCycleSnapshots();
  }, [loadCycleSnapshots]);

  const loadCycleStudyEvents = useCallback(async () => {
    if (!user || !userCycle?.id) {
      setCycleStudyEvents([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cycle_study_events')
        .select('id,event_type,subject_id,topic_id,subject_position,created_at')
        .eq('user_id', user.id)
        .eq('user_cycle_id', userCycle.id)
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      setCycleStudyEvents((data || []) as CycleStudyEvent[]);
    } catch (error) {
      console.warn('Eventos do ciclo indisponíveis:', error);
      setCycleStudyEvents([]);
    }
  }, [user, userCycle?.id]);

  useEffect(() => {
    void loadCycleStudyEvents();
  }, [loadCycleStudyEvents]);

  const { recordCycleEvent } = useCycleStudyEventRecorder({
    dynamicUnificationMap,
    loadCycleStudyEvents,
    user,
    userCycle,
  });

  const recordConfirmedTopicCycleEvent = useCallback(async (
    difficulty?: number | null,
    duration?: number,
  ) => {
    if (!difficultyModalData.topicId || !difficultyModalData.subjectId) return;

    const subject = localSubjects.find((item) => item.id === difficultyModalData.subjectId);
    const eventType: CycleStudyEventType =
      difficultyModalData.reviewCount <= 1 ? 'topic_started' : 'topic_reviewed';

    await recordCycleEvent(eventType, {
      subjectId: difficultyModalData.subjectId,
      topicId: difficultyModalData.topicId,
      editalId: subject?.edital_id || null,
      metadata: {
        topicName: difficultyModalData.topicName,
        subjectName: difficultyModalData.subjectName,
        reviewCount: difficultyModalData.reviewCount,
        reviewStage: difficultyModalData.reviewStage,
        difficulty: difficulty ?? null,
        duration: duration ?? difficultyModalData.duration ?? null,
      },
    });
  }, [difficultyModalData, localSubjects, recordCycleEvent]);

  return useMemo(() => ({
    cycleSnapshots,
    cycleStudyEvents,
    recordCycleEvent,
    recordConfirmedTopicCycleEvent,
    topicStats,
    topicStudyMinutes,
  }), [
    cycleSnapshots,
    cycleStudyEvents,
    recordCycleEvent,
    recordConfirmedTopicCycleEvent,
    topicStats,
    topicStudyMinutes,
  ]);
}
