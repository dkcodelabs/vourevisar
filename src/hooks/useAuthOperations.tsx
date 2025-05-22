
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu e-mail para confirmar o cadastro.',
      });
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
      // Get the current URL to use as redirectTo
      const currentUrl = window.location.origin;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentUrl
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
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
      await supabase.auth.signOut();
    } catch (error: any) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive'
      });
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
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...profile,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Retorna o perfil atualizado para ser usado no componente pai
      const updatedProfile = currentProfile ? { ...currentProfile, ...profile } : null;
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.'
      });
      
      return updatedProfile;
    } catch (error: any) {
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
    updatePassword,
    updateProfile
  };
}
