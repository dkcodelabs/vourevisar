import { supabase } from '@/integrations/supabase/client';
import {
  isBillingContractAcceptanceEnabled,
  signupLegalAcceptance,
  type SignupLegalAcceptance,
} from '@/features/billing/legal/billingLegalDocuments';

const PENDING_LEGAL_ACCEPTANCE_KEY = 'pendingSignupLegalAcceptance';

export const markPendingSignupLegalAcceptance = () => {
  if (!isBillingContractAcceptanceEnabled()) return;
  sessionStorage.setItem(PENDING_LEGAL_ACCEPTANCE_KEY, JSON.stringify(signupLegalAcceptance));
};

export const clearPendingSignupLegalAcceptance = () => {
  sessionStorage.removeItem(PENDING_LEGAL_ACCEPTANCE_KEY);
};

const readPendingSignupLegalAcceptance = (): SignupLegalAcceptance | null => {
  const value = sessionStorage.getItem(PENDING_LEGAL_ACCEPTANCE_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<SignupLegalAcceptance>;
    return parsed.termsVersion === signupLegalAcceptance.termsVersion &&
      parsed.privacyVersion === signupLegalAcceptance.privacyVersion
      ? signupLegalAcceptance
      : null;
  } catch {
    return null;
  }
};

export const completePendingSignupLegalAcceptance = async () => {
  const acceptance = readPendingSignupLegalAcceptance();
  if (!acceptance) return false;

  const { data, error } = await supabase.functions.invoke<{
    accepted?: boolean;
    error?: string;
  }>('legal-accept-documents', { body: acceptance });

  if (error || !data?.accepted) {
    throw new Error(data?.error || 'legal_acceptance_failed');
  }

  clearPendingSignupLegalAcceptance();
  return true;
};
