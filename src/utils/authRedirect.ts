export const getAuthCallbackUrl = (confirmationAttemptId?: string): string => {
  const url = new URL('/auth/callback', window.location.origin);
  if (confirmationAttemptId) {
    url.searchParams.set('confirmation_attempt', confirmationAttemptId);
  }
  return url.toString();
};
