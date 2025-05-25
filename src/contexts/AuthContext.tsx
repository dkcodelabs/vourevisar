import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: { name?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Verificar se há sessão existente
    const checkSession = async () => {
      console.log('Checking for existing session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (session?.user) {
          console.log('Found existing session for user:', session.user.email);
          setUser(session.user);
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Configurar listener para mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'with session' : 'no session');
        
        if (session?.user) {
          setUser(session.user);
          // Só navega para dashboard se estiver na página de login
          if (location.pathname === '/login') {
            navigate('/');
          }
        } else {
          setUser(null);
          // Só navega para login se não estiver já lá
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const signUp = async (email: string, password: string, userData?: { name?: string }) => {
    try {
      setLoading(true);
      console.log('Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message || 'Erro ao criar conta');
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('User signed up successfully:', data.user.email);
        toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Erro desconhecido' };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      toast.error('Erro ao criar conta');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        toast.error(error.message || 'Erro ao fazer login');
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('User signed in successfully:', data.user.email);
        toast.success('Login realizado com sucesso!');
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Erro desconhecido' };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      toast.error('Erro ao fazer login');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with Google');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        toast.error(error.message || 'Erro ao fazer login com Google');
        return { success: false, error: error.message };
      }

      console.log('Google sign in initiated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Google sign in exception:', error);
      toast.error('Erro ao fazer login com Google');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign out user');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        toast.error('Erro ao fazer logout');
        return { success: false, error: error.message };
      }

      console.log('User signed out successfully');
      setUser(null);
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
      return { success: true };
    } catch (error: any) {
      console.error('Sign out exception:', error);
      toast.error('Erro ao fazer logout');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
