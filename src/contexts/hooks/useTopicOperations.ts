
import { supabase } from '@/integrations/supabase/client';
import { Topic } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import { useStudySessionTracking } from '@/hooks/useStudySessionTracking';
import {
  omitTopicProgressFields,
  pickTopicProgressFields,
  syncMergedTopicProgress,
} from '@/services/topicMergeProgressService';
import type { TablesUpdate } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

export const useTopicOperations = (
  user: { id: string } | null,
  loadTopics: (subjectId: string) => Promise<void>,
  refreshData: () => Promise<void>,
  editalId?: string
) => {
  const { recordTopicCompletion } = useStudySessionTracking();

  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id'>) => {
    if (!user) return;
    const finalSubjectId = topicData.subject_id || subjectId;

    try {
      console.log('📝 addTopic - Adding topic:', { topicData });

      // Buscar o edital_id da matéria pai para manter a integridade se não informado
      let finalEditalId = editalId;
      if (!finalEditalId) {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('edital_id')
          .eq('id', finalSubjectId)
          .single();
        finalEditalId = subjectData?.edital_id;
      }

      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: finalSubjectId,
          edital_id: finalEditalId,
          name: topicData.name,
          position: topicData.position,
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
      await loadTopics(finalSubjectId);
      await refreshData();

      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: { action: 'add', subjectId: finalSubjectId }
      }));

      toast.success('Tópico adicionado com sucesso!');
    } catch (err: unknown) {
      errorService.report(err, { module: 'topics', action: 'add', userMessage: 'Erro ao adicionar tópico.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao adicionar tópico', 'TOP-01');
    }
  };

  const updateTopic = async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    if (!user) return;

    try {
      console.log('📝 updateTopic - Updating topic:', { subjectId, topicId, updates });

      const wasCompleted = updates.completed === true;

      const updateData: TablesUpdate<'topics'> = {
        name: updates.name,
        completed: updates.completed,
        review_count: updates.reviewCount ?? updates.review_count,
        review_stage: updates.reviewStage ?? updates.review_stage,
        position: updates.position
      };

      // Handle dates specifically
      if (updates.next_review) updateData.next_review = updates.next_review;
      if (updates.last_reviewed_at) updateData.last_reviewed_at = updates.last_reviewed_at;
      if (updates.first_studied_at) updateData.first_studied_at = updates.first_studied_at;

      // Handle custom fields
      if (updates.notes !== undefined) updateData.notes = updates.notes as unknown as Json;
      if (updates.difficulty_level !== undefined) {
        updateData.difficulty_level = updates.difficulty_level;
        updateData.difficulty_set_at = new Date().toISOString();
      }
      if (updates.subtopics !== undefined) updateData.subtopics = updates.subtopics as unknown as Json;

      const progressUpdate = pickTopicProgressFields(updateData);
      const editorialUpdate = omitTopicProgressFields(updateData);

      if (Object.keys(progressUpdate).length > 0) {
        await syncMergedTopicProgress({
          userId: user.id,
          topicId,
          updateData: progressUpdate,
        });
      }

      if (Object.keys(editorialUpdate).length > 0) {
        const { error } = await supabase
          .from('topics')
          .update(editorialUpdate)
          .eq('id', topicId);

        if (error) throw error;
      }

      if (wasCompleted) {
        try {
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
          }
        } catch (sessionError) {
          console.error('⚠️ Error recording study session:', sessionError);
        }
      }

      await loadTopics(subjectId);
      await refreshData();

      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: { action: 'update', subjectId, topicId }
      }));

    } catch (err: unknown) {
      errorService.report(err, { module: 'topics', action: 'update', userMessage: 'Erro ao atualizar tópico.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao atualizar tópico', 'TOP-02');
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    if (!user) return;

    try {
      // 1. Deletar histórico
      await supabase.from('topic_review_history').delete().eq('topic_id', topicId);

      // 2. Deletar tópico
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) throw error;

      await loadTopics(subjectId);
      await refreshData();

      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: { action: 'delete', subjectId, topicId }
      }));

      toast.success('Tópico removido com sucesso!');
    } catch (err: unknown) {
      errorService.report(err, { module: 'topics', action: 'delete', userMessage: 'Erro ao remover tópico.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao remover tópico', 'TOP-03');
    }
  };

  const markAsReviewed = async (topicId: string, subjectId: string) => {
    if (!user) return;

    try {
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (fetchError) throw fetchError;

      // Spaced repetition logic (simplified)
      const stages: Record<string, number> = {
        'Não Iniciado': 1,
        'Lido': 3,
        'Resumo': 7,
        'Questões': 15,
        'Revisão 1': 30,
        'Revisão 2': 60,
        'Revisão 3': 90,
        'Concluído': 120
      };

      const currentStage = topic.review_stage || 'Não Iniciado';
      const interval = stages[currentStage] || 1;
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      const { error: updateError } = await supabase
        .from('topics')
        .update({
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReviewDate.toISOString(),
          review_count: (topic.review_count || 0) + 1,
          completed: true
        } as unknown)
        .eq('id', topicId);

      if (updateError) throw updateError;

      await loadTopics(subjectId);
      await refreshData();

      toast.success('Revisão registrada!');
    } catch (err: unknown) {
      errorService.report(err, { module: 'topics', action: 'review', userMessage: 'Erro ao registrar revisão.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao registrar revisão', 'TOP-04');
    }
  };

  return {
    addTopic,
    updateTopic,
    deleteTopic,
    markAsReviewed
  };
};
