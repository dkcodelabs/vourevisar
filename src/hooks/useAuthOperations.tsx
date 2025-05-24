import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuthOperations() {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      // Check if email already exists by attempting to get a user with that email
      const { data: existingUserData, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      
      if (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError);
      }

      // If email already exists
      if (existingUserData) {
        throw new Error('Este email já está cadastrado. Por favor, use outro email ou tente fazer login.');
      }
      
      // Proceed with signup
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            provider_type: 'Cadastro' // Store provider type as 'Cadastro' for manual signups
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado. Por favor, use outro email ou tente fazer login.');
        }
        throw error;
      }
      
      // If signup was successful, update the profile with the additional data
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: name,
            phone: phone || null,
            provider_type: 'Cadastro' // Explicitly set provider_type
          })
          .eq('id', data.user.id);
          
        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
      
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu e-mail para confirmar o cadastro.',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Get the current URL with the correct format
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/auth/callback`;
      console.log("Google login redirect URL:", redirectUrl);
      
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) {
        console.error("Google login error:", error);
        throw error;
      }
      
      console.log("Google sign-in initiated successfully", data);
      return data;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: 'Erro ao fazer login com Google',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Verifica se existe sessão antes de tentar deslogar
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Se não há sessão, apenas retorna (ou pode exibir um toast informativo)
        toast({
          title: 'Sessão já encerrada',
          description: 'Você já está deslogado.',
        });
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/perfil`
      });
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar email de recuperação',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi atualizada com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateProfile = async (user: User, profile: Partial<Profile>, currentProfile: Profile | null) => {
    try {
      if (!profile) {
        throw new Error("No profile data provided");
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...profile,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Return the updated profile to be used in the parent component
      const updatedProfile = currentProfile ? { ...currentProfile, ...profile } : null;
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.'
      });
      
      return updatedProfile;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
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
