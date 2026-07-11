import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_TIMER_OPERATION_BLOCKED_MESSAGE,
  ACTIVE_TIMER_OPERATION_BLOCKED_TOAST_ID,
  guardActiveTimerOperation,
  hasActiveStudyTimer,
} from './activeTimerOperationGuard';

const { warningMock } = vi.hoisted(() => ({
  warningMock: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    warning: warningMock,
  },
}));

describe('activeTimerOperationGuard', () => {
  beforeEach(() => {
    warningMock.mockClear();
  });

  it('permite operações estruturais quando não existe cronômetro ativo', () => {
    expect(hasActiveStudyTimer(null)).toBe(false);
    expect(guardActiveTimerOperation(null)).toBe(true);

    expect(warningMock).not.toHaveBeenCalled();
  });

  it('bloqueia operações estruturais com cronômetro rodando', () => {
    const result = guardActiveTimerOperation({
      topicId: 'topic-1',
      status: 'RUNNING',
    });

    expect(result).toBe(false);
    expect(warningMock).toHaveBeenCalledWith(ACTIVE_TIMER_OPERATION_BLOCKED_MESSAGE, {
      id: ACTIVE_TIMER_OPERATION_BLOCKED_TOAST_ID,
      duration: 5200,
    });
  });

  it('bloqueia operações estruturais com cronômetro pausado', () => {
    expect(guardActiveTimerOperation({
      topicId: 'topic-1',
      status: 'PAUSED',
    })).toBe(false);
  });
});
