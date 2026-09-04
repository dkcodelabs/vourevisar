import { supabase } from '@/integrations/supabase/client';

export const DIFFICULTY_NORMALIZATION_KEY = 'normalize_difficulty_scale_1_easy_3_hard';

export async function fetchDifficultyMigrationMarker() {
  return supabase.from('app_data_migrations' as never).select('migration_key').eq('migration_key', DIFFICULTY_NORMALIZATION_KEY).maybeSingle();
}
