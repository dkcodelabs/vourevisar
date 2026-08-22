import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toastManager } from '@/utils/toastManager';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useUserLogger } from '@/hooks/useUserLogger';
import { isEmailConfirmationPending } from '@/utils/authConfirmation';
import { retryProfileLookup } from '@/utils/retryProfileLookup';
import { withTimeout } from '@/utils/withTimeout';
import { AuthContext, AuthContextType } from './auth-context';
import type { Database } from '@/integrations/supabase/types';
import type { SignupLegalAcceptance } from '@/features/billing/legal/billingLegalDocuments';

type Profile = Database['public']['Tables']['profiles']['Row'];

const isInvalidServerSessionError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { message?: string; code?: string; status?: number };
  const message = candidate.message?.toLowerCase() || '';
  const code = candidate.code?.toLowerCase() || '';

  return candidate.status === 401
    || code.includes('user_not_found')
    || message.includes('user from sub claim')
    || message.includes('jwt') && message.includes('invalid');
};

const isAuthLockError = (error: unknown) =>
  error instanceof Error && /lock|acquire/i.test(error.message);

const isEmailConfirmationCallbackSession = (sessionUser: User) => {
  if (typeof window === 'undefined' || window.location.pathname !== '/auth/callback') return false;

  const pendingEmail = window.localStorage.getItem('pendingConfirmationEmail')?.trim().toLowerCase();
  return Boolean(pendingEmail && sessionUser.email?.toLowerCase() === pendingEmail);
};

const clearSupabaseAuthStorage = () => {
  if (typeof window === 'undefined') return;

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
    .forEach((key) => window.localStorage.removeItem(key));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const authOps = useAuthOperations();
  const { logEvent } = useUserLogger();

  // Track last login signature to avoid duplicate logs in same session
  const lastLoginSignature = useRef<string | null>(null);
  // Prevent duplicate logout calls (Hardening)
  const isSigningOutRef = useRef(false);
  // Guard for fetchProfile to avoid loop
  const isFetchingProfileRef = useRef(false);
  // Safari can emit focus and visibility events together during boot. Share a
  // single session read between those events instead of competing for Auth's
  // browser lock.
  const sessionReadInFlightRef = useRef<ReturnType<typeof supabase.auth.getSession> | null>(null);
  const sessionValidationInFlightRef = useRef(false);
  const lastAuthStateChangeAtRef = useRef(0);
  // Every auth event invalidates profile work started by an older identity.
  // This prevents a late RLS-empty response for user A from signing out user B.
  const authTransitionRef = useRef(0);
  const isCredentialCallback = location.pathname === '/auth/callback'
    || location.pathname === '/reset-password';

  const fetchProfile = useCallback(async (userId: string, authTransition: number) => {
    if (isFetchingProfileRef.current) return;

    try {
      isFetchingProfileRef.current = true;
      setProfileLoading(true);

      const { data, error } = await withTimeout(
        retryProfileLookup(
          () => supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
        ),
        10000,
        'Não foi possível carregar seu perfil. Tente novamente.',
      );

      if (error) {
        console.error("[AuthContext] Erro ao buscar perfil:", error);
        return;
      }

      if (authTransitionRef.current !== authTransition) return;

      if (!data) {
        console.warn("[AuthContext] Perfil não encontrado para a sessão; encerrando sessão local.");
        setProfile(null);
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("[AuthContext] Erro inesperado em fetchProfile:", error);
    } finally {
      setProfileLoading(false);
      isFetchingProfileRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // AuthCallback and ResetPassword own their credential-establishment flows.
    // Bootstrapping Auth here at the same time makes Supabase's browser lock
    // race with the callback, especially under React Strict Mode.
    if (isCredentialCallback) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const clearInvalidSession = async () => {
      clearSupabaseAuthStorage();
      await supabase.auth.signOut({ scope: 'local' });
      if (!isMounted) return;
      setUser(null);
      setProfile(null);
      lastLoginSignature.current = null;
    };

    const getSessionOnce = async () => {
      if (sessionReadInFlightRef.current) {
        return sessionReadInFlightRef.current;
      }

      const request = (async () => {
        try {
          return await supabase.auth.getSession();
        } catch (error) {
          if (!isAuthLockError(error)) throw error;
          // A stale Safari lock can survive a page transition. Let the current
          // owner finish before retrying once, without stealing the lock.
          await new Promise((resolve) => setTimeout(resolve, 250));
          return await supabase.auth.getSession();
        }
      })();

      sessionReadInFlightRef.current = request;
      try {
        return await request;
      } finally {
        if (sessionReadInFlightRef.current === request) {
          sessionReadInFlightRef.current = null;
        }
      }
    };

    const validateServerSession = async () => {
      if (isCredentialCallback) return;
      // Do not validate a session while Supabase is still finishing the same
      // SIGNED_IN transition. Safari can dispatch focus/visibility immediately
      // after login; treating that short window as an invalid session causes a
      // successful login to be cleared and leaves the app in a loading loop.
      if (Date.now() - lastAuthStateChangeAtRef.current < 3000) return;
      if (sessionValidationInFlightRef.current) return;
      sessionValidationInFlightRef.current = true;

      try {
        const { data: { session } } = await getSessionOnce();
        if (!session?.user) return;

        const { data: { user: serverUser }, error } = await supabase.auth.getUser();
        if (error && isInvalidServerSessionError(error)) {
          await clearInvalidSession();
          return;
        }

        if (serverUser && isEmailConfirmationPending(serverUser)) {
          localStorage.setItem('pendingConfirmationEmail', serverUser.email || '');
          await clearInvalidSession();
        }
      } finally {
        sessionValidationInFlightRef.current = false;
      }
    };

    // Configurar listener para mudanças de estado primeiro
    const deferredAuthStateTimers = new Set<ReturnType<typeof setTimeout>>();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        lastAuthStateChangeAtRef.current = Date.now();
        const authTransition = ++authTransitionRef.current;

        // Supabase explicitly warns against awaiting Supabase calls inside this
        // callback: it owns the auth lock while dispatching the event. Defer all
        // profile, sign-out and logging work until the callback has returned.
        const timer = setTimeout(async () => {
          deferredAuthStateTimers.delete(timer);
          if (!isMounted) return;

          try {
            if (session?.user && isEmailConfirmationPending(session.user)) {
              localStorage.setItem('pendingConfirmationEmail', session.user.email || '');
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
              lastLoginSignature.current = null;
              return;
            }

            if (session?.user) {
            // A deleted/orphaned profile can still produce a valid Supabase auth
            // session. Validate ownership before exposing the session to the app
            // or recording LOGIN_SUCCESS, otherwise admin access metrics become
            // incorrect and the user briefly appears authenticated.
            const { data: profileRow, error: profileLookupError } = await withTimeout(
              retryProfileLookup(
                () => supabase
                  .from('profiles')
                  .select('id, is_active')
                  .eq('id', session.user.id)
                  .maybeSingle(),
              ),
              10000,
              'Não foi possível confirmar seu perfil. Tente novamente.',
            );

              if (authTransitionRef.current !== authTransition) return;

              if (!profileLookupError && !profileRow) {
              console.warn('[AuthContext] Sessão sem perfil; encerrando sessão local antes de registrar acesso.');
              await supabase.auth.signOut({ scope: 'local' });
              setUser(null);
              setProfile(null);
              lastLoginSignature.current = null;
                return;
              }

              if (!profileLookupError && profileRow?.is_active === false) {
              await withTimeout(
                supabase.auth.signOut({ scope: 'local' }),
                5000,
                'Logout local da conta desativada',
              ).catch(() => undefined);
              setUser(null);
              setProfile(null);
              lastLoginSignature.current = null;
              if (isMounted) {
                setLoading(false);
                toastManager.warning('Sua conta está desativada. Entre em contato com o suporte.', {
                  id: 'account-deactivated',
                });
                navigate('/login', {
                  replace: true,
                });
              }
                return;
              }

              setUser(session.user);

            // Log LOGIN_SUCCESS only after the profile check succeeds. A network
            // error must not be converted into a successful access metric.
              if (!profileLookupError && event === 'SIGNED_IN' && !isEmailConfirmationCallbackSession(session.user)) {
              const signature = session.access_token?.slice(-16);
              if (signature && signature !== lastLoginSignature.current) {
                lastLoginSignature.current = signature;
                logEvent('LOGIN_SUCCESS', {
                  request_id: crypto.randomUUID(),
                  source: 'auth_signed_in'
                }, 'web_app', { user: session.user, accessToken: session.access_token });
              }
            }

              if (!isFetchingProfileRef.current) {
              const profileTimer = setTimeout(() => {
                deferredAuthStateTimers.delete(profileTimer);
                if (isMounted && authTransitionRef.current === authTransition) {
                  fetchProfile(session.user.id, authTransition);
                }
              }, 100);
              deferredAuthStateTimers.add(profileTimer);
              }
            } else {
              setUser(null);
              setProfile(null);
              lastLoginSignature.current = null;
            }

          } catch (error) {
            if (!isMounted) return;
            if (authTransitionRef.current !== authTransition) return;

            console.error('[AuthContext] Falha ao concluir autenticação:', error);
            await withTimeout(
              supabase.auth.signOut({ scope: 'local' }),
              5000,
              'Logout local',
            ).catch(() => undefined);
            setUser(null);
            setProfile(null);
            lastLoginSignature.current = null;
            toastManager.error('Não foi possível confirmar seu acesso. Tente novamente.', {
              id: 'auth-bootstrap-failed',
            });
          } finally {
            if (isMounted) {
              setLoading(false);
              setAuthInitialized(true);
            }
          }
        }, 0);

        deferredAuthStateTimers.add(timer);
      }
    );

    // The auth listener also emits INITIAL_SESSION. It is the single source of
    // truth for bootstrapping auth; a second getSession here races Supabase's
    // own initialization when a persisted session is present.
    window.addEventListener('focus', validateServerSession);
    document.addEventListener('visibilitychange', validateServerSession);

    return () => {
      isMounted = false;
      deferredAuthStateTimers.forEach(clearTimeout);
      deferredAuthStateTimers.clear();
      subscription.unsubscribe();
      window.removeEventListener('focus', validateServerSession);
      document.removeEventListener('visibilitychange', validateServerSession);
    };
  // The listener must not be recreated for every normal route transition.
  // Recreating it leaves a moment with no resolved user while a protected
  // route mounts, which used to redirect a valid Stripe/checkout session to
  // Login before the new INITIAL_SESSION event arrived.
  }, [fetchProfile, isCredentialCallback, logEvent, navigate]);

  const signUp = useCallback(async (email: string, password: string, name: string, phone?: string, legalAcceptance?: SignupLegalAcceptance) => {
    try {
      setLoading(true);

      const result = await authOps.signUp(email, password, name, phone, legalAcceptance);
      return { success: true, user: result?.user || undefined, confirmationPending: result?.confirmationPending };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authOps]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);

      await authOps.signIn(email, password);
      return { success: true };
    } catch (error: unknown) {
      // A failed sign-in has no auth event that could finish the transition.
      // Successful attempts remain loading until SIGNED_IN validates the
      // profile and exposes the authenticated user to the application.
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }, [authOps]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);

      await authOps.signInWithGoogle();
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authOps]);

  const signOut = useCallback(async (options: { redirect?: boolean; skipAudit?: boolean } = {}) => {
    // Prevent re-entry using Ref (Hardening)
    if (isSigningOutRef.current) return { success: true };
    isSigningOutRef.current = true;

    try {
      setLoading(true);

      if (user && !options.skipAudit) {
        try { await logEvent('LOGOUT', { source: 'signOut_handler_v2' }, 'web_app', { user }); } catch (e) { /* ignore */ }
      }

      // Clear sensitive storage
      clearSensitiveLocalStorage(user?.id);

      await authOps.signOut();

      setUser(null);
      setProfile(null);
      lastLoginSignature.current = null;

      if (options.redirect !== false) {
        navigate('/login');
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      // Keep lock briefly to prevent bounces
      setTimeout(() => { isSigningOutRef.current = false; }, 2000);
    }
  }, [user, logEvent, authOps, navigate]);

  // Helper function to clear sensitive localStorage data on logout
  const clearSensitiveLocalStorage = (userId?: string) => {
    // Clear content upload data
    localStorage.removeItem('contentUpload_content');
    localStorage.removeItem('contentUpload_chatGptResult');

    // Clear user-specific caches
    if (userId) {
      localStorage.removeItem(`subjects_cache_${userId}`);
      localStorage.removeItem(`user_cycle_cache_${userId}`);
      // Clear legacy SESSION_START throttle
      localStorage.removeItem(`last_session_log_${userId}`);
      // Clear new SESSION_START throttle
      localStorage.removeItem(`audit:last_session_start:${userId}`);
    }

    // Clear all draft keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear pomodoro state
    localStorage.removeItem('pomodoroState');
  };

  const updateProfile = useCallback(async (profileData: Partial<Profile>) => {
    if (!user) throw new Error('No user found');

    const updatedProfile = await authOps.updateProfile(user, profileData, profile);
    setProfile(updatedProfile);
  }, [user, authOps, profile]);

  const updatePassword = useCallback(async (password: string) => {
    await authOps.updatePassword(password);
  }, [authOps]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authOps.resetPassword(email);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }, [authOps]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    authInitialized,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
  }), [user, profile, loading, authInitialized, signUp, signIn, signInWithGoogle, signOut, updateProfile, updatePassword, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
