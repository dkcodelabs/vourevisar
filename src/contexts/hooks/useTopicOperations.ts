
import { supabase } from '@/integrations/supabase/client';
import { Topic } from '@/types';
import { toast } from 'sonner';

export const useTopicOperations = (
  user: any,
  loadSubjects: () => Promise<void>,
  refreshData: () => Promise<void>
) => {
  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          name: topicData.name,
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null
        });

      if (error) throw error;

      await loadSubjects();
      await refreshData();
      toast.success('Tópico adicionado com sucesso!');
    } catch (error: any) {
      console.error('Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
      throw error;
    }
  };

  const updateTopic = async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    try {
      const updateData: any = {
        name: updates.name,
        completed: updates.completed,
        review_count: updates.reviewCount || updates.review_count,
        review_stage: updates.reviewStage,
        next_review: updates.nextReview?.toISOString(),
      };

      // Só atualizar as datas se foram fornecidas
      if (updates.lastReviewedAt) {
        updateData.last_reviewed_at = updates.lastReviewedAt.toISOString();
      }
      if (updates.firstStudiedAt) {
        updateData.first_studied_at = updates.firstStudiedAt.toISOString();
      }

      const { error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId);

      if (error) throw error;

      await loadSubjects();
    } catch (error: any) {
      console.error('Error updating topic:', error);
      toast.error('Erro ao atualizar tópico');
      throw error;
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      await loadSubjects();
      toast.success('Tópico removido com sucesso!');
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast.error('Erro ao remover tópico');
      throw error;
    }
  };

  return {
    addTopic,
    updateTopic,
    deleteTopic
  };
};
