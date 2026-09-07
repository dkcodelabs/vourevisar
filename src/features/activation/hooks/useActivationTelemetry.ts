import { useCallback, useEffect } from 'react';
import type { ActivationJourney } from '@/features/activation/types';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLogger } from '@/hooks/useUserLogger';

type ActivationMethod = 'catalog' | 'ai' | 'manual' | 'resume';

const milestoneByKind: Partial<Record<ActivationJourney['kind'], 'ACTIVATION_EDITAL_READY' | 'ACTIVATION_CYCLE_READY'>> = {
  edital_selection_required: 'ACTIVATION_EDITAL_READY',
  cycle_not_loaded: 'ACTIVATION_EDITAL_READY',
  first_study_pending: 'ACTIVATION_CYCLE_READY',
};

export function useActivationTelemetry(journey: ActivationJourney | null) {
  const { user } = useAuth();
  const { logEvent } = useUserLogger();

  useEffect(() => {
    if (!user?.id || !journey || journey.kind === 'activated') return;

    const viewedKey = `activation:viewed:${user.id}:${journey.kind}`;
    if (!sessionStorage.getItem(viewedKey)) {
      sessionStorage.setItem(viewedKey, '1');
      void logEvent('ACTIVATION_VIEWED', { state: journey.kind });
    }

    const milestone = milestoneByKind[journey.kind];
    if (!milestone) return;
    const milestoneKey = `activation:milestone:${user.id}:${milestone}`;
    if (localStorage.getItem(milestoneKey)) return;
    localStorage.setItem(milestoneKey, '1');
    void logEvent(milestone, { state: journey.kind });
  }, [journey, logEvent, user?.id]);

  const logMethodSelection = useCallback((method: ActivationMethod) => {
    if (!journey) return;
    void logEvent('ACTIVATION_METHOD_SELECTED', { method, state: journey.kind });
  }, [journey, logEvent]);

  return { logMethodSelection };
}

export function useActivationCompletionTelemetry(isActivated: boolean) {
  const { user } = useAuth();
  const { logEvent } = useUserLogger();

  useEffect(() => {
    if (!isActivated || !user?.id) return;
    const key = `activation:completed:${user.id}:v1`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    void logEvent('ACTIVATION_COMPLETED', { criterion: 'first_topic_started' });
  }, [isActivated, logEvent, user?.id]);
}
