import { supabase } from '@/integrations/supabase/client';

export async function markSubjectCompleted(subjectId: string) {
  const { error } = await supabase.from('subjects').update({
    status: 'Concluída',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subjectId);
  if (error) throw error;
}
