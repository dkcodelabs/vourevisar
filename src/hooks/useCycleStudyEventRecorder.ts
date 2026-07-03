import { useCallback } from 'react';

import type { UserCycle } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import { getUnifiedSubjectId } from '@/services/cycleMergeService';
import {
  recordCycleStudyEvent,
  type CycleStudyEventType,
} from '@/services/cycleStudyEventsService';

type UseCycleStudyEventRecorderInput = {
  dynamicUnificationMap: CycleUnificationMap;
  loadCycleStudyEvents: () => Promise<void>;
  user: { id: string } | null;
  userCycle: UserCycle | null;
};

type RecordCycleEventOptions = {
  subjectId?: string | null;
  topicId?: string | null;
  editalId?: string | null;
  metadata?: Record<string, unknown>;
  cycleOrderSnapshot?: string[];
  subjectPosition?: number | null;
};

export function useCycleStudyEventRecorder({
  dynamicUnificationMap,
  loadCycleStudyEvents,
  user,
  userCycle,
}: UseCycleStudyEventRecorderInput) {
  const getCycleEventContext = useCallback((subjectId?: string | null) => {
    const cycleOrderSnapshot = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );
    const normalizedSubjectId = subjectId
      ? getUnifiedSubjectId(subjectId, dynamicUnificationMap)
      : null;
    const subjectPosition = normalizedSubjectId
      ? cycleOrderSnapshot.indexOf(normalizedSubjectId) + 1
      : null;

    return {
      cycleNumber: (userCycle?.ciclos_realizados || 0) + 1,
      cycleOrderSnapshot,
      subjectPosition: subjectPosition && subjectPosition > 0 ? subjectPosition : null,
    };
  }, [dynamicUnificationMap, userCycle?.ciclo_atual, userCycle?.ciclos_realizados]);

  const recordCycleEvent = useCallback(async (
    eventType: CycleStudyEventType,
    options: RecordCycleEventOptions = {},
  ) => {
    if (!user || !userCycle) return false;

    const context = getCycleEventContext(options.subjectId);
    const recorded = await recordCycleStudyEvent({
      userId: user.id,
      userCycleId: userCycle.id,
      cycleNumber: context.cycleNumber,
      eventType,
      subjectId: options.subjectId || null,
      topicId: options.topicId || null,
      editalId: options.editalId || null,
      subjectPosition: options.subjectPosition ?? context.subjectPosition,
      cycleOrderSnapshot: options.cycleOrderSnapshot || context.cycleOrderSnapshot,
      metadata: options.metadata,
    });

    if (recorded) {
      await loadCycleStudyEvents();
    }

    return recorded;
  }, [getCycleEventContext, loadCycleStudyEvents, user, userCycle]);

  return {
    getCycleEventContext,
    recordCycleEvent,
  };
}
