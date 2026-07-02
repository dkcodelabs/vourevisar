
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { Database } from '@/integrations/supabase/types';
import {
  EMAIL_NOT_CONFIRMED_ERROR,
  isEmailConfirmationPending,
} from '@/utils/authConfirmation';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuthOperations() {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user && isEmailConfirmationPending(data.user)) {
        localStorage.setItem('pendingConfirmationEmail', email);
        await supabase.auth.signOut();
        throw new Error(EMAIL_NOT_CONFIRMED_ERROR);
      }

      // toastManager.success('Login realizado com sucesso!', {
      //   id: 'login-success'
      // });
      return data;
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      // toastManager.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting to sign up user:', normalizedEmail);

      // Check if email already exists using secure function
      const { data: emailCheckResult, error: emailCheckError } = await supabase
        .rpc('check_email_exists', { email_to_check: normalizedEmail });

      if (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError);
        throw new Error('Erro ao verificar email. Tente novamente.');
      }

      // If email exists, handle based on provider type
      if (emailCheckResult && emailCheckResult.length > 0) {
        const { email_exists, provider_type, email_confirmed } = emailCheckResult[0];

        if (email_exists) {
          if (provider_type === 'Google' || provider_type === 'google') {
            throw new Error('Este e-mail já está cadastrado com sua conta Google. Por favor, faça login com o Google ou use outro e-mail.');
          } else if (!email_confirmed) {
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: normalizedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`
              }
            });

            if (resendError?.status === 429) {
              throw new Error('Este e-mail já está cadastrado, mas ainda não foi confirmado. Aguarde alguns minutos antes de reenviar o link.');
            }

            if (resendError) {
              throw new Error('Este e-mail já está cadastrado, mas ainda não foi confirmado. Use o link enviado anteriormente ou tente reenviar mais tarde.');
            }

            localStorage.setItem('pendingConfirmationEmail', normalizedEmail);
            toastManager.success('Este e-mail já tinha um cadastro pendente. Reenviamos o link de confirmação.');
            return { user: null, session: null, confirmationPending: true };
          } else {
            throw new Error('Este e-mail já está cadastrado. Por favor, faça login com sua senha ou recupere sua senha.');
          }
        }
      }

      console.log('Email available, proceeding with signup for:', normalizedEmail);

      // Proceed with signup
      const { error, data } = await supabase.auth.signUp({
        email: normalizedEmail,
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

      const confirmationPending = Boolean(data.user && isEmailConfirmationPending(data.user));
      if (confirmationPending && data.session) {
        await supabase.auth.signOut();
      }

      toastManager.success('Cadastro realizado! Verifique seu e-mail para confirmar o cadastro.');
      return { ...data, confirmationPending };
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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

      // Clear SESSION_START throttle localStorage BEFORE signing out
      // This ensures we have access to user.id while session is still valid
      if (session?.user) {
        const LAST_SESSION_LOG_KEY = `last_session_log_${session.user.id}`;
        localStorage.removeItem(LAST_SESSION_LOG_KEY);
      }

      // Now sign out
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toastManager.success('Sessão encerrada.');
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
