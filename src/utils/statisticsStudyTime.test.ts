import { describe, expect, it } from 'vitest';

import { getStatisticsStudyTime } from './statisticsStudyTime';

describe('getStatisticsStudyTime', () => {
  it('uses real scoped time instead of difficulty estimates for cycle statistics', () => {
    expect(
      getStatisticsStudyTime({
        sessionMinutes: 40,
        reviewHistoryMinutes: 25,
        pomodoroMinutes: 0,
        estimatedMinutes: 180,
        includePomodoro: false,
      }),
    ).toBe(40);
  });

  it('uses scoped review history minutes when session rows are lower or missing', () => {
    expect(
      getStatisticsStudyTime({
        sessionMinutes: 0,
        reviewHistoryMinutes: 55,
        pomodoroMinutes: 0,
        estimatedMinutes: 120,
        includePomodoro: false,
      }),
    ).toBe(55);
  });

  it('allows pomodoro minutes only in global statistics', () => {
    expect(
      getStatisticsStudyTime({
        sessionMinutes: 20,
        reviewHistoryMinutes: 10,
        pomodoroMinutes: 90,
        estimatedMinutes: 300,
        includePomodoro: true,
      }),
    ).toBe(90);
  });
});
