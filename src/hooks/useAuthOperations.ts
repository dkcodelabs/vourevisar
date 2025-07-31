import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuthOperations() {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      console.log('Sign in successful:', data.user?.email);
      toast.success('Login realizado com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      // Check if email already exists in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      
      if (profileData && !profileError) {
        throw new Error('Este email já está cadastrado. Por favor, tente fazer login ou usar outro email.');
      }
      
      // Set proper redirect URL for email confirmation
      const redirectUrl = `${window.location.origin}/`;
      
      // Proceed with signup
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            phone,
            provider_type: 'Cadastro'
          }
        }
      });
      
      if (error) {
        // Handle specific Supabase auth errors for duplicate users
        if (error.message.includes('already registered') || 
            error.message.includes('user_repeated_signup') ||
            error.message.includes('User already registered') ||
            error.message.includes('signup_disabled')) {
          throw new Error('Este email já está cadastrado. Por favor, tente fazer login ou usar outro email.');
        }
        
        // Handle email validation errors
        if (error.message.includes('Invalid email')) {
          throw new Error('Email inválido. Verifique o formato do email.');
        }
        
        // Handle password errors
        if (error.message.includes('Password')) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        
        throw error;
      }
      
      console.log('Sign up successful:', data.user?.email);
      
      // Check if user was created but needs email confirmation
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de fazer login.');
      } else if (data.user) {
        toast.success('Cadastro realizado com sucesso!');
      }
      
      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Better error handling for different scenarios
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (error.message.includes('cadastrado') || error.message.includes('registered')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Email inválido. Verifique o formato do email.';
      } else if (error.message.includes('Password') || error.message.includes('senha')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      console.log("Iniciando login com Google...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          },
          skipBrowserRedirect: false
        }
      });
      
      if (error) {
        console.error("Erro no login com Google:", error);
        throw error;
      }
      
      console.log("Login com Google iniciado com sucesso");
      return data;
    } catch (error: any) {
      console.error("Erro no login com Google:", error);
      toast.error('Erro ao fazer login com Google. Verifique sua conexão e tente novamente.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Get current session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session found');
        toast.success('Logout realizado com sucesso!');
        return;
      }

      console.log('Signing out user:', session.user?.email);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('Logout successful');
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should clear local state
      toast.error('Erro ao sair, mas você foi desconectado localmente');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://revisao-inteligente-concursos-16.lovable.app/reset-password'
      });
      
      if (error) throw error;
      
      toast.success('Email de recuperação enviado!');
      return true;
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Erro ao enviar email de recuperação');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
    } catch (error: any) {
      console.error('Update password error:', error);
      toast.error('Erro ao atualizar senha');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (user: User, profileData: Partial<Profile>, currentProfile: Profile | null) => {
    setLoading(true);
    try {
      if (!profileData) {
        throw new Error("No profile data provided");
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString() 
        });
        
      if (error) throw error;
      
      const updatedProfile = currentProfile ? { ...currentProfile, ...profileData } : null;
      
      toast.success('Perfil atualizado com sucesso!');
      return updatedProfile;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  };
}
