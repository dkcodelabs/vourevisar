
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useProfileData } from '@/hooks/useProfileData';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const auth = useAuthOperations();
  const { profile, fetchProfile, updateLocalProfile } = useProfileData();

  useEffect(() => {
    // Configurar o listener de mudança de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setTimeout(() => {
            fetchProfile(newSession.user.id);
          }, 0);
        } else {
          updateLocalProfile(null);
        }

        if (event === 'SIGNED_IN') {
          navigate('/');
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // Verificar se já existe uma sessão
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, fetchProfile, updateLocalProfile]);

  // Wrapper functions to maintain the same API interface
  const signIn = (email: string, password: string) => {
    return auth.signIn(email, password);
  };

  const signUp = (email: string, password: string, name: string, phone?: string) => {
    return auth.signUp(email, password, name, phone);
  };

  const signInWithGoogle = () => {
    return auth.signInWithGoogle();
  };

  const signOut = () => {
    return auth.signOut();
  };

  const updatePassword = (password: string) => {
    return auth.updatePassword(password);
  };

  const updateProfile = async (profileData: Partial<Profile>) => {
    if (!user) return;
    
    const updatedProfile = await auth.updateProfile(user, profileData, profile);
    updateLocalProfile(updatedProfile);
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
