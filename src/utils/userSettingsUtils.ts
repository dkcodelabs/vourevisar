
import { supabase } from '@/integrations/supabase/client';

export interface UserSettings {
  subjects_per_day: number;
  notifications_enabled: boolean;
  notification_time: string;
}

export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('subjects_per_day, notifications_enabled, notification_time')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user settings:', error);
    // Return default settings if fetch fails
    return {
      subjects_per_day: 3,
      notifications_enabled: true,
      notification_time: '08:00'
    };
  }

  return data || {
    subjects_per_day: 3,
    notifications_enabled: true,
    notification_time: '08:00'
  };
};
