import { supabase } from '@/integrations/supabase/client';

export const getCurrentAuthUser = () => supabase.auth.getUser();
export const resendConfirmationEmail = (email: string, emailRedirectTo: string) => supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } });
export const signOutAuth = (scope?: 'global' | 'local') => scope ? supabase.auth.signOut({ scope }) : supabase.auth.signOut();
export const requestPasswordReset = (email: string, redirectTo: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo });
export const setAuthSession = (session: Parameters<typeof supabase.auth.setSession>[0]) => supabase.auth.setSession(session);
export const verifyAuthOtp = (params: Parameters<typeof supabase.auth.verifyOtp>[0]) => supabase.auth.verifyOtp(params);
export const exchangeAuthCode = (code: string) => supabase.auth.exchangeCodeForSession(code);
export const getAuthSession = () => supabase.auth.getSession();
export const updateAuthPassword = (password: string) => supabase.auth.updateUser({ password });
