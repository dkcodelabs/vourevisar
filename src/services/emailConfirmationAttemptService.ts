import { supabase } from '@/integrations/supabase/client';

const ATTEMPT_STORAGE_KEY = 'pendingConfirmationAttemptId';

export type EmailConfirmationAttemptStatus = 'pending' | 'confirmed' | 'unknown';

const isValidAttemptId = (value: string | null): value is string =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

const invokeAttemptFunction = async (body: Record<string, string>) => {
  const { data, error } = await supabase.functions.invoke('email-confirmation-status', { body });
  if (error) throw error;
  return data as { status?: EmailConfirmationAttemptStatus } | null;
};

export const getStoredConfirmationAttemptId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(ATTEMPT_STORAGE_KEY);
  return isValidAttemptId(value) ? value : null;
};

export const createEmailConfirmationAttempt = async (): Promise<string> => {
  const attemptId = crypto.randomUUID();
  await invokeAttemptFunction({ action: 'create', attempt_id: attemptId });
  localStorage.setItem(ATTEMPT_STORAGE_KEY, attemptId);
  return attemptId;
};

export const ensureEmailConfirmationAttempt = async (): Promise<string> => {
  return getStoredConfirmationAttemptId() ?? createEmailConfirmationAttempt();
};

export const getEmailConfirmationAttemptStatus = async (
  attemptId: string,
): Promise<EmailConfirmationAttemptStatus> => {
  try {
    const data = await invokeAttemptFunction({ action: 'status', attempt_id: attemptId });
    return data?.status === 'confirmed' ? 'confirmed' : 'pending';
  } catch {
    return 'unknown';
  }
};

export const markEmailConfirmationAttemptConfirmed = async (attemptId: string): Promise<void> => {
  await invokeAttemptFunction({ action: 'confirm', attempt_id: attemptId });
};
