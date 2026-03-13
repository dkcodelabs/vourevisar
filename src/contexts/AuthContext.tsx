import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useUserLogger } from '@/hooks/useUserLogger';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileData: Partial<Profile>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    let isMounted = true;

    // Configurar listener para mudanças de estado primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Log LOGIN_SUCCESS explicitly when SIGNED_IN event happens
        if (event === 'SIGNED_IN' && session?.user) {
          const signature = session.access_token?.slice(-16);
          // Simple in-memory dedupe + RPC dedupe via request_id
          if (signature && signature !== lastLoginSignature.current) {
            lastLoginSignature.current = signature;
            // Fire and forget log with a specific request ID for tracing
            logEvent('LOGIN_SUCCESS', {
              request_id: crypto.randomUUID(),
              source: 'auth_signed_in'
            });
          }
        }

        if (session?.user) {
          setUser(session.user);
          // Buscar perfil apenas se não estiver já carregando
          if (!profileLoading) {
            setTimeout(() => {
              if (isMounted) {
                fetchProfile(session.user.id);
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
      try {
        const startTime = performance.now();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (error.message?.includes('FetchError') || error.message?.includes('AbortError')) {
            console.warn("[AuthContext] Latência ou Abort detectado no boot. Aguardando listener...");
            return;
          }
          throw error;
        }

        if (session?.user && isMounted) {
          setUser(session.user);
          if (session.access_token) {
            lastLoginSignature.current = session.access_token.slice(-16);
          }
          await fetchProfile(session.user.id);
          const duration = (performance.now() - startTime).toFixed(0);
          console.log(`[AuthContext] Sessão recuperada em ${duration}ms`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn("[AuthContext] Chamada de sessão abortada (comum em remounts ou rede instável)");
        } else {
          console.error("[AuthContext] Erro ao verificar sessão:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [logEvent]);

  const fetchProfile = async (userId: string) => {
    if (profileLoading) return; // Evitar múltiplas chamadas

    try {
      setProfileLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Se não encontrar perfil, criar um
        if (error.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userData.user.id,
                email: userData.user.email,
                name: userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || 'Usuário',
                phone: userData.user.user_metadata?.phone || null,
                avatar_url: userData.user.user_metadata?.avatar_url || null
              });

            if (!insertError) {
              // Buscar o perfil criado
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userData.user.id)
                .single();

              if (newProfile) {
                setProfile(newProfile);
              }
            }
          }
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      // Silenciar erros 
    } finally {
      setProfileLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      setLoading(true);

      const result = await authOps.signUp(email, password, name, phone);
      return { success: true, user: result?.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      await authOps.signIn(email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      await authOps.signInWithGoogle();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Prevent re-entry using Ref (Hardening)
    if (isSigningOutRef.current) return { success: true };
    isSigningOutRef.current = true;

    try {
      setLoading(true);

      try { await logEvent('LOGOUT', { source: 'signOut_handler_v2' }, 'web_app'); } catch (e) { /* ignore */ }

      // Clear sensitive storage
      clearSensitiveLocalStorage(user?.id);

      await authOps.signOut();

      setUser(null);
      setProfile(null);
      lastLoginSignature.current = null;

      navigate('/login');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      // Keep lock briefly to prevent bounces
      setTimeout(() => { isSigningOutRef.current = false; }, 2000);
    }
  };

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

  const updateProfile = async (profileData: Partial<Profile>) => {
    if (!user) throw new Error('No user found');

    try {
      const updatedProfile = await authOps.updateProfile(user, profileData, profile);
      setProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      await authOps.updatePassword(password);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authOps.resetPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
