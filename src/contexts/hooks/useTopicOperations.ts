
import { supabase } from '@/integrations/supabase/client';
import { Topic, TopicNotes } from '@/types';
import { toast } from '@/lib/toast';
import { useStudySessionTracking } from '@/hooks/useStudySessionTracking';

export const useTopicOperations = (
  user: any,
  loadSubjects: () => Promise<void>,
  refreshData: () => Promise<void>
) => {
  const { recordTopicCompletion } = useStudySessionTracking();
  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id'>) => {
    if (!user) return;

    try {
      console.log('📝 addTopic - Adding topic:', { subjectId, topicData });
      
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
          last_reviewed_at: null,
          notes: null
        });

      if (error) throw error;

      console.log('✅ addTopic - Success, refreshing data...');
      
      // refreshData já chama loadSubjects internamente
      await refreshData();
      
      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('topicUpdated', { 
        detail: { action: 'add', subjectId, topicId: null } 
      }));
      
      toast.success('Tópico adicionado com sucesso!');
    } catch (error: any) {
      console.error('❌ Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
      throw error;
    }
  };

  const updateTopic = async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    try {
      console.log('📝 updateTopic - Updating topic:', { subjectId, topicId, updates });
      
      // Verificar se o tópico está sendo marcado como concluído
      const wasCompleted = updates.completed === true;
      
      const updateData: any = {
        name: updates.name,
        completed: updates.completed,
        review_count: updates.reviewCount || updates.review_count,
        review_stage: updates.reviewStage,
        next_review: updates.nextReview?.toISOString(),
      };

      // Só atualizar as datas se foram fornecidas
      if (updates.lastReviewedAt || updates.last_reviewed_at) {
        updateData.last_reviewed_at = (updates.lastReviewedAt || updates.last_reviewed_at)?.toISOString();
      }
      if (updates.firstStudiedAt || updates.first_studied_at) {
        updateData.first_studied_at = (updates.firstStudiedAt || updates.first_studied_at)?.toISOString();
      }

      // Atualizar anotações se fornecidas
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }

      // Atualizar nível de dificuldade se fornecido
      if (updates.difficulty_level !== undefined) {
        updateData.difficulty_level = updates.difficulty_level;
        updateData.difficulty_set_at = new Date().toISOString();
      }

      // Atualizar subtópicos se fornecidos
      if (updates.subtopics !== undefined) {
        updateData.subtopics = updates.subtopics;
      }

      console.log('📝 updateTopic - Final updateData:', updateData);

      const { error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId);

      if (error) throw error;

      // Se o tópico foi marcado como concluído, registrar sessão de estudo
      if (wasCompleted) {
        try {
          // Buscar informações da matéria
          const { data: subjectData } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', subjectId)
            .single();

          if (subjectData) {
            await recordTopicCompletion(
              subjectId,
              subjectData.name,
              topicId,
              updates.name || 'Tópico'
            );
            console.log('✅ Sessão de estudo registrada para tópico concluído');
          }
        } catch (sessionError) {
          console.error('⚠️ Erro ao registrar sessão de estudo:', sessionError);
          // Não falhar a operação principal por causa do tracking
        }
      }

      console.log('✅ updateTopic - Success, refreshing data...');
      
      // refreshData já chama loadSubjects internamente
      await refreshData();
      
      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('topicUpdated', { 
        detail: { action: 'update', subjectId, topicId } 
      }));
      
    } catch (error: any) {
      console.error('❌ Error updating topic:', error);
      toast.error('Erro ao atualizar tópico');
      throw error;
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    try {
      console.log('🗑️ deleteTopic - Deleting topic:', { subjectId, topicId });
      
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      console.log('✅ deleteTopic - Success, refreshing data...');
      
      // refreshData já chama loadSubjects internamente
      await refreshData();
      
      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('topicUpdated', { 
        detail: { action: 'delete', subjectId, topicId } 
      }));
      
      toast.success('Tópico removido com sucesso!');
    } catch (error: any) {
      console.error('❌ Error deleting topic:', error);
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
