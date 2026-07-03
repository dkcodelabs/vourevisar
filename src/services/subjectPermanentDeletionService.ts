import { supabase } from '@/integrations/supabase/client';

type EditalSubjectReference = {
  id: string;
  subjectIds: string[];
};

export type SubjectDeletionRepository = {
  deleteSubject: (subjectId: string, userId: string) => Promise<void>;
  deleteTopicHistory: (topicIds: string[], userId: string) => Promise<void>;
  deleteTopics: (subjectId: string) => Promise<void>;
  listTopicIds: (subjectId: string) => Promise<string[]>;
  listUserEditais: (userId: string) => Promise<EditalSubjectReference[]>;
  updateEditalSubjectIds: (editalId: string, subjectIds: string[]) => Promise<void>;
};

const throwIfError = (error: unknown) => {
  if (error) throw error;
};

const supabaseSubjectDeletionRepository: SubjectDeletionRepository = {
  async listUserEditais(userId) {
    const { data, error } = await supabase
      .from('user_editais')
      .select('id, subject_ids')
      .eq('user_id', userId);
    throwIfError(error);

    return (data || []).map(edital => ({
      id: edital.id,
      subjectIds: Array.isArray(edital.subject_ids) ? edital.subject_ids : [],
    }));
  },

  async updateEditalSubjectIds(editalId, subjectIds) {
    const { error } = await supabase
      .from('user_editais')
      .update({ subject_ids: subjectIds })
      .eq('id', editalId);
    throwIfError(error);
  },

  async listTopicIds(subjectId) {
    const { data, error } = await supabase
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId);
    throwIfError(error);
    return (data || []).map(topic => topic.id);
  },

  async deleteTopicHistory(topicIds, userId) {
    if (topicIds.length === 0) return;
    const { error } = await supabase
      .from('topic_review_history')
      .delete()
      .eq('user_id', userId)
      .in('topic_id', topicIds);
    throwIfError(error);
  },

  async deleteTopics(subjectId) {
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('subject_id', subjectId);
    throwIfError(error);
  },

  async deleteSubject(subjectId, userId) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', userId);
    throwIfError(error);
  },
};

type DeleteSubjectPermanentlyInput = {
  editalIdToRemove?: string;
  repository?: SubjectDeletionRepository;
  subjectId: string;
  userId: string;
};

export async function deleteSubjectPermanently({
  editalIdToRemove,
  repository = supabaseSubjectDeletionRepository,
  subjectId,
  userId,
}: DeleteSubjectPermanentlyInput): Promise<{ subjectDeleted: boolean }> {
  const editais = await repository.listUserEditais(userId);
  const linkedEditais = editais.filter(edital => edital.subjectIds.includes(subjectId));

  if (editalIdToRemove) {
    const targetEdital = linkedEditais.find(edital => edital.id === editalIdToRemove);
    if (!targetEdital) throw new Error('Matéria não vinculada ao edital selecionado.');

    await repository.updateEditalSubjectIds(
      targetEdital.id,
      targetEdital.subjectIds.filter(id => id !== subjectId),
    );

    if (linkedEditais.some(edital => edital.id !== editalIdToRemove)) {
      return { subjectDeleted: false };
    }
  } else {
    for (const edital of linkedEditais) {
      await repository.updateEditalSubjectIds(
        edital.id,
        edital.subjectIds.filter(id => id !== subjectId),
      );
    }
  }

  const topicIds = await repository.listTopicIds(subjectId);
  await repository.deleteTopicHistory(topicIds, userId);
  await repository.deleteTopics(subjectId);
  await repository.deleteSubject(subjectId, userId);

  return { subjectDeleted: true };
}
