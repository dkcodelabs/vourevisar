import { supabase } from '@/integrations/supabase/client';

export async function createEditalSuggestion(userId: string, concursoName: string) {
  const { error } = await supabase.from('edital_suggestions').insert({ user_id: userId, concurso_name: concursoName });
  if (error) throw error;
}
