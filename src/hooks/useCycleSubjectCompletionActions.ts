import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { getUnifiedSubjectId } from '@/services/cycleMergeService';
import type { CycleStudyEventType } from '@/services/cycleStudyEventsService';
import type { Subject, UserCycle } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

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

type UseCycleSubjectCompletionActionsInput = {
  cycleClosedSubjectIdSet: Set<string>;
  dynamicUnificationMap: CycleUnificationMap;
  expandedSubjectList: ExpandedSubjectItem[];
  getEquivalentSubjectIds: (subjectId: string) => Set<string>;
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  localSubjects: Subject[];
  recordCycleEvent: RecordCycleEvent;
  setCompleteCycleConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setCycleExpandedSubjectIds: Dispatch<SetStateAction<string[]>>;
  setPendingCompleteSubjectId: Dispatch<SetStateAction<string | null>>;
  setUserCycle: Dispatch<SetStateAction<UserCycle | null>>;
  user: { id: string } | null;
  userCycle: UserCycle | null;
};

export function useCycleSubjectCompletionActions({
  cycleClosedSubjectIdSet,
  dynamicUnificationMap,
  expandedSubjectList,
  getEquivalentSubjectIds,
  getUnifiedSubjectName,
  localSubjects,
  recordCycleEvent,
  setCompleteCycleConfirmOpen,
  setCycleExpandedSubjectIds,
  setPendingCompleteSubjectId,
  setUserCycle,
  user,
  userCycle,
}: UseCycleSubjectCompletionActionsInput) {
  const executeMarcarMateriaComoEstudada = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    const normalizedMateriaId = getUnifiedSubjectId(materiaId, dynamicUnificationMap);
    const equivalentSubjectIds = getEquivalentSubjectIds(materiaId);
    const updatedStudiedIds = [
      ...currentStudied.filter((id: string) =>
        !equivalentSubjectIds.has(id) &&
        getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId
      ),
      normalizedMateriaId,
    ];
    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: Array.from(new Set(updatedStudiedIds)),
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(updatedCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(updatedCycle));
    setCycleExpandedSubjectIds(prev => prev.filter(id =>
      !equivalentSubjectIds.has(id) &&
      getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId &&
      id !== rawSubjectId
    ));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_ciclo: updatedCycle.materias_estudadas_ciclo,
          atualizado_em: updatedCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const subject = localSubjects.find(item => item.id === materiaId);
      const subjectName = getUnifiedSubjectName(materiaId, subject?.name || 'Matéria');
      await recordCycleEvent('subject_marked_studied', {
        subjectId: materiaId,
        editalId: subject?.edital_id || null,
        metadata: {
          subjectName,
        },
      });
      toast.success(`${subjectName} marcada como estudada neste ciclo.`);

      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'markSubjectStudied' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleMarcarMateriaComoEstudada',
          userMessage: 'Erro ao marcar matéria como estudada.',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
    }
  }, [dynamicUnificationMap, getEquivalentSubjectIds, getUnifiedSubjectName, localSubjects, recordCycleEvent, setCycleExpandedSubjectIds, setUserCycle, user, userCycle]);

  const handleMarcarMateriaComoEstudada = useCallback((materiaId: string) => {
    if (!userCycle) return;

    const pendingSubjects = expandedSubjectList.filter(item => !cycleClosedSubjectIdSet.has(item.subject.id));
    const isLastPending = pendingSubjects.length === 1 &&
      pendingSubjects[0].subject.id === getUnifiedSubjectId(materiaId, dynamicUnificationMap);

    if (isLastPending) {
      setPendingCompleteSubjectId(materiaId);
      setCompleteCycleConfirmOpen(true);
    } else {
      executeMarcarMateriaComoEstudada(materiaId);
    }
  }, [cycleClosedSubjectIdSet, dynamicUnificationMap, executeMarcarMateriaComoEstudada, expandedSubjectList, setCompleteCycleConfirmOpen, setPendingCompleteSubjectId, userCycle]);

  const handleVoltarMateriaParaFila = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    const normalizedMateriaId = getUnifiedSubjectId(materiaId, dynamicUnificationMap);
    const equivalentSubjectIds = getEquivalentSubjectIds(materiaId);
    const updatedStudied = currentStudied.filter((id: string) =>
      id !== rawSubjectId &&
      !equivalentSubjectIds.has(id) &&
      getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId
    );
    if (updatedStudied.length === currentStudied.length) return;

    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: updatedStudied,
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(updatedCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(updatedCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_ciclo: updatedCycle.materias_estudadas_ciclo,
          atualizado_em: updatedCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const subject = localSubjects.find(item => item.id === materiaId);
      const subjectName = getUnifiedSubjectName(materiaId, subject?.name || 'Matéria');
      await recordCycleEvent('subject_returned_to_queue', {
        subjectId: materiaId,
        editalId: subject?.edital_id || null,
        metadata: {
          subjectName,
        },
      });
      toast.success(`${subjectName} voltou para a fila do ciclo.`);
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'returnSubjectToQueue' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleVoltarMateriaParaFila',
          userMessage: 'Erro ao voltar matéria para a fila.',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
    }
  }, [dynamicUnificationMap, getEquivalentSubjectIds, getUnifiedSubjectName, localSubjects, recordCycleEvent, setUserCycle, user, userCycle]);

  return {
    executeMarcarMateriaComoEstudada,
    handleMarcarMateriaComoEstudada,
    handleVoltarMateriaParaFila,
  };
}
