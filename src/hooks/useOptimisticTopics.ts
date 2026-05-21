
import { useState, useCallback, useEffect } from 'react';
import { Topic, TopicNotes } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

export const useOptimisticTopics = (
  initialTopics: Topic[],
  subjectId: string,
  onTopicsUpdate: (topics: Topic[]) => void
) => {
  const [localTopics, setLocalTopics] = useState<Topic[]>(initialTopics);
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar com props quando elas mudarem (ex: após refresh do pai)
  // Usamos JSON.stringify para evitar loops se as referências mudarem mas o conteúdo for igual
  useEffect(() => {
    setLocalTopics(initialTopics);
  }, [JSON.stringify(initialTopics)]);

  const addTopic = useCallback(async (name: string) => {
    if (!name.trim()) {
      toastGate.notifyError('Digite o nome do tópico', 'HOOKS-USEOPTIMISTICTOPICS-01', { severity: 'medium' });
      return;
    }

    setIsLoading(true);

    // Criar tópico temporário para atualização otimista
    const tempTopic: Topic = {
      id: `temp-${Date.now()}`,
      name: name.trim(),
      completed: false,
      reviewCount: 0,
      review_count: 0,
      reviewStage: undefined,
      nextReview: undefined,
      firstStudiedAt: undefined,
      lastReviewedAt: undefined,
      first_studied_at: undefined,
      last_reviewed_at: undefined,
      is_completed: false,
      notes: undefined
    };

    // Atualização otimista
    const updatedTopics = [...localTopics, tempTopic];
    setLocalTopics(updatedTopics);
    // REMOVIDO: onTopicsUpdate(updatedTopics) para evitar race condition com refreshData
    // O pai só será notificado após a confirmação do banco


    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          name: name.trim(),
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null,
          notes: null
        })
        .select()
        .single();

      if (error) throw error;

      // Mapear dados do Supabase para o tipo Topic
      const mappedTopic: Topic = {
        id: data.id,
        name: data.name,
        completed: data.completed,
        reviewCount: data.review_count || 0,
        review_count: data.review_count || 0,
        reviewStage: data.review_stage || undefined,
        nextReview: data.next_review ? new Date(data.next_review) : undefined,
        firstStudiedAt: data.first_studied_at ? new Date(data.first_studied_at) : undefined,
        lastReviewedAt: data.last_reviewed_at ? new Date(data.last_reviewed_at) : undefined,
        first_studied_at: data.first_studied_at,
        last_reviewed_at: data.last_reviewed_at,
        is_completed: data.completed,
        notes: data.notes ? (data.notes as TopicNotes) : undefined
      };

      // Substituir tópico temporário pelo real
      const finalTopics = updatedTopics.map(t =>
        t.id === tempTopic.id ? mappedTopic : t
      );

      setLocalTopics(finalTopics);
      onTopicsUpdate(finalTopics);

      toast.success('Tópico adicionado com sucesso!');
      return mappedTopic;
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      // Reverter atualização otimista
      setLocalTopics(localTopics);
      onTopicsUpdate(localTopics);
      toastGate.notifyError('Erro ao adicionar tópico', 'HOOKS-USEOPTIMISTICTOPICS-02', { severity: 'medium' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [localTopics, subjectId, onTopicsUpdate]);

  const updateTopic = useCallback(async (topicId: string, updates: Partial<Topic>) => {
    // Atualização otimista
    const updatedTopics = localTopics.map(t =>
      t.id === topicId ? { ...t, ...updates } : t
    );

    setLocalTopics(updatedTopics);
    onTopicsUpdate(updatedTopics);

    try {
      // Converter campos de Date para string para o Supabase
      const supabaseUpdates: any = { ...updates };

      if (updates.firstStudiedAt) {
        supabaseUpdates.first_studied_at = updates.firstStudiedAt.toISOString();
        delete supabaseUpdates.firstStudiedAt;
      }

      if (updates.lastReviewedAt) {
        supabaseUpdates.last_reviewed_at = updates.lastReviewedAt.toISOString();
        delete supabaseUpdates.lastReviewedAt;
      }

      if (updates.nextReview) {
        supabaseUpdates.next_review = updates.nextReview.toISOString();
        delete supabaseUpdates.nextReview;
      }

      if (updates.reviewCount !== undefined) {
        supabaseUpdates.review_count = updates.reviewCount;
        delete supabaseUpdates.reviewCount;
      }

      if (updates.completed !== undefined) {
        supabaseUpdates.is_completed = updates.completed;
      }

      // Campos camelCase já foram removidos/convertidos acima
      // Campos snake_case prontos para envio ao Supabase

      const { error } = await supabase
        .from('topics')
        .update(supabaseUpdates)
        .eq('id', topicId);

      if (error) throw error;

      toast.success('Tópico atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
      // Reverter atualização otimista
      setLocalTopics(localTopics);
      onTopicsUpdate(localTopics);
      toastGate.notifyError('Erro ao atualizar tópico', 'HOOKS-USEOPTIMISTICTOPICS-03', { severity: 'medium' });
      throw error;
    }
  }, [localTopics, onTopicsUpdate]);

  const deleteTopic = useCallback(async (topicId: string) => {
    // Atualização otimista
    const updatedTopics = localTopics.filter(t => t.id !== topicId);
    setLocalTopics(updatedTopics);
    onTopicsUpdate(updatedTopics);

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      toast.success('Tópico excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar tópico:', error);
      // Reverter atualização otimista
      setLocalTopics(localTopics);
      onTopicsUpdate(localTopics);
      toastGate.notifyError('Erro ao excluir tópico', 'HOOKS-USEOPTIMISTICTOPICS-04', { severity: 'medium' });
      throw error;
    }
  }, [localTopics, onTopicsUpdate]);

  return {
    topics: localTopics,
    isLoading,
    addTopic,
    updateTopic,
    deleteTopic,
    setTopics: setLocalTopics
  };
};
