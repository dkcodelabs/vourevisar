import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';
import { useAuthOperations } from '@/hooks/useAuthOperations';
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

  useEffect(() => {
    let isMounted = true;

    // Configurar listener para mudanças de estado primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

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
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // Verificar se há sessão existente
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session?.user) {
          if (isMounted) {
            setUser(session.user);
            setTimeout(() => {
              if (isMounted) {
                fetchProfile(session.user.id);
              }
            }, 100);
          }
        }
      } catch (error) {
        // Silenciar erros para não poluir o console
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
  }, []);

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
      // Silenciar erros para não poluir o console
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
    try {
      setLoading(true);
      
      await authOps.signOut();
      
      // Clear all sensitive data from localStorage on logout
      clearSensitiveLocalStorage(user?.id);
      
      setUser(null);
      setProfile(null);
      
      navigate('/login');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
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
