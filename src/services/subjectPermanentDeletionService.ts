import { supabase } from '@/integrations/supabase/client';

type AtomicDeleteSubjectResult = {
  ok?: boolean;
  error?: string;
  subject_deleted?: boolean;
};

type DeleteSubjectPermanentlyInput = {
  editalIdToRemove?: string;
  subjectId: string;
  userId: string;
};

export async function deleteSubjectPermanently({
  editalIdToRemove,
  subjectId,
  userId,
}: DeleteSubjectPermanentlyInput): Promise<{ subjectDeleted: boolean }> {
  const { data, error } = await supabase.rpc('atomic_delete_subject', {
    p_edital_id_to_remove: editalIdToRemove || null,
    p_subject_id: subjectId,
    p_user_id: userId,
  });

  if (error) throw error;

  const result = data as AtomicDeleteSubjectResult | null;
  if (result?.ok !== true) {
    throw new Error(result?.error || 'Não foi possível excluir a matéria.');
  }

  return { subjectDeleted: result.subject_deleted === true };
}
