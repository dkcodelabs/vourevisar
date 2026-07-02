import { useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Topic } from '@/types';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

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
      toastGate.notifyError('Erro ao completar tópico', 'HOOKS-USETOPICWITHDIFFICULTY-01', { severity: 'medium' });
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
        difficulty_level: difficulty as unknown,
      });

      if (difficulty) {
        const difficultyLabels = {
          1: 'Fácil',
          2: 'Médio',
          3: 'Difícil'
        };
        
        toast.success(`Dificuldade: ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}`);
      } else {
        toast.info('Avaliação de dificuldade removida');
      }
    } catch (error) {
      console.error('Erro ao salvar dificuldade:', error);
      toastGate.notifyError('Erro ao salvar avaliação de dificuldade', 'HOOKS-USETOPICWITHDIFFICULTY-02', { severity: 'medium' });
    }
  }, [updateTopic]);

  return {
    completeTopicWithDifficultyPrompt,
    updateTopicDifficulty,
  };
};
