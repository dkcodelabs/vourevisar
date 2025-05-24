import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useProfileData } from '@/hooks/useProfileData';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  
  const auth = useAuthOperations();
  const { profile, fetchProfile, updateLocalProfile } = useProfileData();

  // Function to handle user data after authentication
  const handleUserData = async (currentUser: User | null) => {
    if (currentUser) {
      try {
        console.log('Fetching profile for user:', currentUser.id);
        const profileData = await fetchProfile(currentUser.id);
        if (!profileData) {
          console.log('No profile found, user may need to complete registration');
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    } else {
      console.log('No user, clearing profile data');
      updateLocalProfile(null);
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession ? 'has session' : 'no session');
        
        // Update state synchronously first
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle profile data asynchronously
        if (newSession?.user) {
          setTimeout(() => {
            handleUserData(newSession.user);
          }, 0);
        } else {
          updateLocalProfile(null);
        }

        // Handle navigation based on auth events - avoid duplicate toasts
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, redirecting to login');
          navigate('/login');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in, redirecting to dashboard');
          // Force navigation to ensure page loads correctly
          setTimeout(() => {
            navigate('/', { replace: true });
            // Force a page refresh to ensure proper loading
            window.location.reload();
          }, 100);
        }
        
        // Mark auth as initialized after first event
        if (!authInitialized) {
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    );

    // Check for existing session on load
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        console.log('Initial session:', currentSession ? 'exists' : 'none');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await handleUserData(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast.error('Erro de autenticação. Faça login novamente.');
      } finally {
        if (!authInitialized) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [navigate, authInitialized]);

  // Wrapper functions with proper error handling - avoid duplicate toasts
  const signIn = async (email: string, password: string) => {
    try {
      await auth.signIn(email, password);
      // Don't show toast here, auth operations already handles it
    } catch (error) {
      console.error('Sign in wrapper error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      return await auth.signUp(email, password, name, phone);
      // Don't show toast here, auth operations already handles it
    } catch (error) {
      console.error('Sign up wrapper error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await auth.signInWithGoogle();
      // Don't show toast here, auth operations already handles it
    } catch (error) {
      console.error('Google sign in wrapper error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      await auth.signOut();
      // Don't show toast here, auth operations already handles it
    } catch (error) {
      console.error('Sign out wrapper error:', error);
      // Even if logout fails, clear local state
      setSession(null);
      setUser(null);
      updateLocalProfile(null);
      navigate('/login');
    }
  };

  const updatePassword = async (password: string) => {
    try {
      await auth.updatePassword(password);
    } catch (error) {
      console.error('Update password wrapper error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      return await auth.resetPassword(email);
    } catch (error) {
      console.error('Reset password wrapper error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<Profile>) => {
    try {
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      const updatedProfile = await auth.updateProfile(user, profileData, profile);
      updateLocalProfile(updatedProfile);
    } catch (error) {
      console.error('Update profile wrapper error:', error);
      throw error;
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
