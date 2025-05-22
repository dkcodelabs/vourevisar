
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/components/ui/use-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfileData() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
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
    } catch (error) {
      console.error('Error in fetchProfile:', error);
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
    fetchProfile,
    updateLocalProfile
  };
}
