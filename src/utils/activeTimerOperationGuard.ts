import type { ActiveTimer } from '@/contexts/TimerContext';
import { toast } from '@/lib/toast';

type GuardableActiveTimer = Pick<ActiveTimer, 'topicId' | 'status'> | null | undefined;

export const ACTIVE_TIMER_OPERATION_BLOCKED_TOAST_ID = 'active-study-timer-operation-blocked';

export const ACTIVE_TIMER_OPERATION_BLOCKED_MESSAGE =
  'Finalize, retome ou descarte a sessão em andamento antes de alterar o ciclo.';

export const hasActiveStudyTimer = (activeTimer: GuardableActiveTimer): boolean => (
  Boolean(activeTimer?.topicId)
);

export const guardActiveTimerOperation = (
  activeTimer: GuardableActiveTimer,
  message = ACTIVE_TIMER_OPERATION_BLOCKED_MESSAGE,
): boolean => {
  if (!hasActiveStudyTimer(activeTimer)) return true;

  toast.warning(message, {
    id: ACTIVE_TIMER_OPERATION_BLOCKED_TOAST_ID,
    duration: 5200,
  });

  return false;
};
