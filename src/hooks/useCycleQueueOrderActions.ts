import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import type { Subject, UserCycle } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import type { CycleStudyEventType } from '@/services/cycleStudyEventsService';

type SubjectTab = 'all' | 'vertical';

type ExpandedSubjectItem = {
  id: string;
  subject: Subject;
};

type RecordCycleEvent = (
  eventType: CycleStudyEventType,
  options?: {
    subjectId?: string | null;
    topicId?: string | null;
    editalId?: string | null;
    metadata?: Record<string, unknown>;
    cycleOrderSnapshot?: string[];
    subjectPosition?: number | null;
  }
) => Promise<boolean>;

type UseCycleQueueOrderActionsInput = {
  activeTab: SubjectTab;
  expandedSubjectList: ExpandedSubjectItem[];
  orderedCycleDisplayList: ExpandedSubjectItem[];
  recordCycleEvent: RecordCycleEvent;
  setIsReorderingCycle: Dispatch<SetStateAction<boolean>>;
  setUserCycle: Dispatch<SetStateAction<UserCycle | null>>;
  user: { id: string } | null;
  userCycle: UserCycle | null;
};

export function useCycleQueueOrderActions({
  activeTab,
  expandedSubjectList,
  orderedCycleDisplayList,
  recordCycleEvent,
  setIsReorderingCycle,
  setUserCycle,
  user,
  userCycle,
}: UseCycleQueueOrderActionsInput) {
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!user || !userCycle) return;

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const sortableList = activeTab === 'all' ? orderedCycleDisplayList : expandedSubjectList;
    const oldIndex = sortableList.findIndex((item) => item.id === active.id);
    const newIndex = sortableList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortableList, oldIndex, newIndex);
    const newCicloAtual = reordered.map(item => item.subject.id);
    const previousUserCycle = userCycle;
    const newUserCycle = {
      ...userCycle,
      ciclo_atual: newCicloAtual,
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(newUserCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(newUserCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: newCicloAtual,
          atualizado_em: newUserCycle.atualizado_em,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await recordCycleEvent('cycle_reordered', {
        cycleOrderSnapshot: newCicloAtual,
        metadata: {
          previousOrder: previousUserCycle.ciclo_atual || [],
          newOrder: newCicloAtual,
          movedSubjectId: String(active.id),
          fromPosition: oldIndex + 1,
          toPosition: newIndex + 1,
        },
      });

      toast.success('Ordem do ciclo atualizada!');
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDragEnd',
          userMessage: 'Erro ao atualizar ordem do ciclo',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
    }
  }, [activeTab, expandedSubjectList, orderedCycleDisplayList, recordCycleEvent, setUserCycle, user, userCycle]);

  const handleApplySuggestedQueueOrder = useCallback(async (suggestedOrder: string[]) => {
    if (!user || !userCycle || suggestedOrder.length === 0) return;

    setIsReorderingCycle(false);

    const previousUserCycle = userCycle;
    const nextUserCycle = {
      ...userCycle,
      ciclo_atual: suggestedOrder,
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(nextUserCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextUserCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: suggestedOrder,
          atualizado_em: nextUserCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('id', userCycle.id)
        .eq('status', 'active');

      if (error) throw error;

      await recordCycleEvent('cycle_reordered', {
        cycleOrderSnapshot: suggestedOrder,
        metadata: {
          source: 'strategic_suggestion',
          previousOrder: previousUserCycle.ciclo_atual || [],
          newOrder: suggestedOrder,
        },
      });

      toast.success('Sugestão aplicada. A fila do ciclo foi reorganizada.');
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(error, {
        module: 'Subjects',
        action: 'handleApplySuggestedQueueOrder',
        userMessage: 'Erro ao aplicar sugestão de fila.',
        severity: 'medium',
        scope: 'core',
        userId: user.id,
      });
    }
  }, [recordCycleEvent, setIsReorderingCycle, setUserCycle, user, userCycle]);

  return {
    handleApplySuggestedQueueOrder,
    handleDragEnd,
  };
}
