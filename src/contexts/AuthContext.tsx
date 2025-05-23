import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useProfileData } from '@/hooks/useProfileData';
import { toast } from '@/components/ui/use-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manualLogin, setManualLogin] = useState(false);
  const navigate = useNavigate();
  
  const auth = useAuthOperations();
  const { profile, fetchProfile, updateLocalProfile } = useProfileData();

  // Function to handle user data after authentication
  const handleUserData = async (currentUser: User | null) => {
    if (currentUser) {
      try {
        const profileData = await fetchProfile(currentUser.id);
        if (!profileData) {
          console.log('No profile found, user may need to complete registration');
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    } else {
      updateLocalProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setTimeout(() => {
            handleUserData(newSession.user);
          }, 0);
        } else {
          updateLocalProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
        // Só redireciona para / se for login manual
        if (event === 'SIGNED_IN' && manualLogin) {
          navigate('/');
          setManualLogin(false);
        }
      }
    );

    // Check for existing session on load
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('Initial session:', currentSession ? 'exists' : 'none');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await handleUserData(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast({
          title: 'Erro de autenticação',
          description: 'Não foi possível carregar os dados do usuário.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Wrapper functions to manter o controle do login manual
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setManualLogin(true);
    try {
      await auth.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signUp = (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      return auth.signUp(email, password, name, phone);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setManualLogin(true);
    try {
      await auth.signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    try {
      await auth.updatePassword(password);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      return await auth.resetPassword(email);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<Profile>) => {
    setLoading(true);
    try {
      if (!user) return;
      
      const updatedProfile = await auth.updateProfile(user, profileData, profile);
      updateLocalProfile(updatedProfile);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading: loading || auth.loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updatePassword,
    resetPassword,
    updateProfile
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
