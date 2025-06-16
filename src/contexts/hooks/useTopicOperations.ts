
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
          review_stage: '24h',
          next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
      const { error } = await supabase
        .from('topics')
        .update({
          name: updates.name,
          completed: updates.completed,
          review_count: updates.reviewCount || updates.review_count,
          review_stage: updates.reviewStage,
          next_review: updates.nextReview?.toISOString(),
          last_reviewed_at: updates.lastReviewedAt?.toISOString()
        })
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
