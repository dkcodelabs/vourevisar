import { supabase } from '@/integrations/supabase/client';

export async function uploadProfileAvatar(userId: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `avatars/${userId}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
