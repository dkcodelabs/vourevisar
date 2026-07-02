
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/lib/toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfileData() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (supabaseError) {
        console.error('Error fetching profile:', supabaseError);
        setError(new Error(supabaseError.message));
        return null;
      }

      // If we got data, update the local state
      if (data) {
        setProfile(data);
        return data;
      } else {
        console.log('No profile found for user:', userId);
        return null;
      }
    } catch (error: unknown) {
      console.error('Error in fetchProfile:', error);
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocalProfile = (newProfile: Profile | null) => {
    setProfile(newProfile);
  };

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateLocalProfile
  };
}
