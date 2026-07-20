import React, { createContext, useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useUserLogger } from '@/hooks/useUserLogger';
import { Database } from '@/integrations/supabase/types';
import { isEmailConfirmationPending } from '@/utils/authConfirmation';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; user?: User; error?: string; confirmationPending?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileData: Partial<Profile>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isInvalidRefreshTokenError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found');
};

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

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null) => {
    if (isFetchingProfileRef.current) return;

    try {
      isFetchingProfileRef.current = true;
      setProfileLoading(true);
      // Silencioso

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AuthContext] Erro ao buscar perfil:", error);
        return;
      }

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
    const isAuthCallback = location.pathname === '/auth/callback';

    // AuthCallback is the sole owner of setSession/exchangeCodeForSession.
    // Bootstrapping Auth here at the same time makes Supabase's browser lock
    // race with the callback, especially under React Strict Mode.
    if (isAuthCallback) {
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
      if (location.pathname === '/auth/callback') return;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user && isEmailConfirmationPending(session.user)) {
          localStorage.setItem('pendingConfirmationEmail', session.user.email || '');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          lastLoginSignature.current = null;
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          // A deleted/orphaned profile can still produce a valid Supabase auth
          // session. Validate ownership before exposing the session to the app
          // or recording LOGIN_SUCCESS, otherwise admin access metrics become
          // incorrect and the user briefly appears authenticated.
          const { data: profileRow, error: profileLookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!profileLookupError && !profileRow) {
            console.warn('[AuthContext] Sessão sem perfil; encerrando sessão local antes de registrar acesso.');
            await supabase.auth.signOut({ scope: 'local' });
            setUser(null);
            setProfile(null);
            lastLoginSignature.current = null;
            if (isMounted) setLoading(false);
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

          // Buscar perfil apenas se não estiver já carregando
          if (!isFetchingProfileRef.current) {
            setTimeout(() => {
              if (isMounted) {
                fetchProfile(session.user.id, session.user);
              }
            }, 100);
          }
        } else {
          setUser(null);
          setProfile(null);
          lastLoginSignature.current = null; // Reset signature on logout
        }

        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // Verificar se há sessão existente
    const checkSession = async () => {
      if (sessionValidationInFlightRef.current) return;
      sessionValidationInFlightRef.current = true;

      try {
        const startTime = performance.now();
        const { data: { session }, error } = await getSessionOnce();

        if (error) {
          if (error.message?.includes('FetchError') || error.message?.includes('AbortError')) {
            console.warn("[AuthContext] Latência ou Abort detectado no boot. Aguardando listener...");
            return;
          }

          if (isInvalidRefreshTokenError(error)) {
            clearSupabaseAuthStorage();
            await supabase.auth.signOut({ scope: 'local' });
            setUser(null);
            setProfile(null);
            lastLoginSignature.current = null;
            return;
          }

          throw error;
        }

        if (session?.user && isEmailConfirmationPending(session.user) && isMounted) {
          localStorage.setItem('pendingConfirmationEmail', session.user.email || '');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          lastLoginSignature.current = null;
        } else if (session?.user && isMounted) {
          const { data: { user: serverUser }, error: serverError } = await supabase.auth.getUser();
          if (serverError && isInvalidServerSessionError(serverError)) {
            await clearInvalidSession();
            return;
          }

          if (!serverUser) {
            await clearInvalidSession();
            return;
          }

          setUser(session.user);
          if (session.access_token) {
            lastLoginSignature.current = session.access_token.slice(-16);
          }
          await fetchProfile(session.user.id, session.user);
          const duration = (performance.now() - startTime).toFixed(0);
          // Silencioso
        }
      } catch (error: unknown) {
        if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
          console.warn("[AuthContext] Chamada de sessão abortada (comum em remounts ou rede instável)");
        } else if (isInvalidRefreshTokenError(error)) {
          clearSupabaseAuthStorage();
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setProfile(null);
          lastLoginSignature.current = null;
        } else {
          console.error("[AuthContext] Erro ao verificar sessão:", error);
        }
      } finally {
        sessionValidationInFlightRef.current = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    window.addEventListener('focus', validateServerSession);
    document.addEventListener('visibilitychange', validateServerSession);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', validateServerSession);
      document.removeEventListener('visibilitychange', validateServerSession);
    };
  }, [fetchProfile, location.pathname, logEvent]);

  const signUp = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      setLoading(true);

      const result = await authOps.signUp(email, password, name, phone);
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
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

  const signOut = useCallback(async () => {
    // Prevent re-entry using Ref (Hardening)
    if (isSigningOutRef.current) return { success: true };
    isSigningOutRef.current = true;

    try {
      setLoading(true);

      if (user) {
        try { await logEvent('LOGOUT', { source: 'signOut_handler_v2' }, 'web_app', { user }); } catch (e) { /* ignore */ }
      }

      // Clear sensitive storage
      clearSensitiveLocalStorage(user?.id);

      await authOps.signOut();

      setUser(null);
      setProfile(null);
      lastLoginSignature.current = null;

      navigate('/login');
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
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
  }), [user, profile, loading, signUp, signIn, signInWithGoogle, signOut, updateProfile, updatePassword, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
