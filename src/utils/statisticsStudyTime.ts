type StatisticsStudyTimeInput = {
  sessionMinutes: number;
  reviewHistoryMinutes: number;
  pomodoroMinutes: number;
  estimatedMinutes: number;
  includePomodoro: boolean;
};

export function getStatisticsStudyTime({
  sessionMinutes,
  reviewHistoryMinutes,
  pomodoroMinutes,
  estimatedMinutes: _estimatedMinutes,
  includePomodoro,
}: StatisticsStudyTimeInput): number {
  const realSources = [
    Math.max(0, sessionMinutes || 0),
    Math.max(0, reviewHistoryMinutes || 0),
  ];

  if (includePomodoro) {
    realSources.push(Math.max(0, pomodoroMinutes || 0));
  }

  return Math.max(...realSources);
}
