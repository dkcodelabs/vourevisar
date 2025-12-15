import { useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Topic } from '@/types';
import { toast } from '@/lib/toast';

interface TopicCompletionData {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
}

export const useTopicWithDifficulty = () => {
  const { updateTopic } = useApp();

  const completeTopicWithDifficultyPrompt = useCallback(async (
    data: TopicCompletionData,
    updates: Partial<Topic>,
    onDifficultyPrompt?: () => void
  ) => {
    try {
      // Primeiro, atualizar o tópico
      await updateTopic(data.subjectId, data.topicId, updates);
      
      // Se o tópico foi marcado como concluído e não tem dificuldade definida, mostrar modal
      if (updates.completed === true && !updates.difficulty_level) {
        // Aguardar um pouco para a UI se atualizar
        setTimeout(() => {
          if (onDifficultyPrompt) {
            onDifficultyPrompt();
          }
        }, 500);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao completar tópico:', error);
      toast.error('Erro ao completar tópico');
      return false;
    }
  }, [updateTopic]);

  const updateTopicDifficulty = useCallback(async (
    subjectId: string,
    topicId: string,
    difficulty: number | null
  ) => {
    try {
      await updateTopic(subjectId, topicId, {
        difficulty_level: difficulty as any,
      });

      if (difficulty) {
        const difficultyLabels = {
          1: 'Muito Fácil',
          2: 'Fácil', 
          3: 'Médio',
          4: 'Difícil',
          5: 'Muito Difícil'
        };
        
        const stars = '⭐'.repeat(difficulty);
        toast.success(`Dificuldade: ${difficultyLabels[difficulty as keyof typeof difficultyLabels]} ${stars}`);
      } else {
        toast.info('Avaliação de dificuldade removida');
      }
    } catch (error) {
      console.error('Erro ao salvar dificuldade:', error);
      toast.error('Erro ao salvar avaliação de dificuldade');
    }
  }, [updateTopic]);

  return {
    completeTopicWithDifficultyPrompt,
    updateTopicDifficulty,
  };
};