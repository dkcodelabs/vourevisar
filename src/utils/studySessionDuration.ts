export const getStudySessionDurationMinutes = (
  sessionDurationMinutes: number | null | undefined,
) => Math.max(0, Number(sessionDurationMinutes || 0));
