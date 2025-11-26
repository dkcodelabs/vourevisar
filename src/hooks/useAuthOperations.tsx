
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuthOperations() {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toastManager.success('Login realizado com sucesso!', {
        id: 'login-success'
      });
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toastManager.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      console.log('Attempting to sign up user:', email);

      // Check if email already exists using secure function
      const { data: emailCheckResult, error: emailCheckError } = await supabase
        .rpc('check_email_exists', { email_to_check: email });

      if (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError);
        throw new Error('Erro ao verificar email. Tente novamente.');
      }

      // If email exists, handle based on provider type
      if (emailCheckResult && emailCheckResult.length > 0) {
        const { email_exists, provider_type } = emailCheckResult[0];

        if (email_exists) {
          if (provider_type === 'Google' || provider_type === 'google') {
            throw new Error('Este e-mail já está cadastrado com sua conta Google. Por favor, faça login com o Google ou use outro e-mail.');
          } else {
            throw new Error('Este e-mail já está cadastrado. Por favor, faça login com sua senha ou recupere sua senha.');
          }
        }
      }

      console.log('Email available, proceeding with signup for:', email);

      // Proceed with signup
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            provider_type: 'Cadastro'
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado. Por favor, use outro email ou tente fazer login.');
        }
        throw error;
      }

      toastManager.success('Cadastro realizado! Verifique seu e-mail para confirmar o cadastro.');
      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);
      toastManager.error(error.message || 'Erro ao criar conta');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // Usar o domínio atual para callback
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      toastManager.error('Erro ao fazer login com Google. Verifique as configurações OAuth.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Get current session first - but proceed to sign out regardless to ensure cleanup
      const { data: { session } } = await supabase.auth.getSession();

      // if (!session) {
      //   toastManager.success('Logout realizado com sucesso!');
      //   return;
      // }

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toastManager.success('Logout realizado com sucesso!');
    } catch (error: any) {
      // Even if there's an error, we should clear local state
      toastManager.error('Erro ao sair, mas você foi desconectado localmente');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toastManager.success('Email de recuperação enviado!');
      return true;
    } catch (error: any) {
      console.error('Reset password error:', error);
      toastManager.error('Erro ao enviar email de recuperação');
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

      toastManager.success('Senha atualizada com sucesso!');
    } catch (error: any) {
      console.error('Update password error:', error);
      toastManager.error('Erro ao atualizar senha');
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

      toastManager.success('Perfil atualizado com sucesso!');
      return updatedProfile;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toastManager.error('Erro ao atualizar perfil');
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
