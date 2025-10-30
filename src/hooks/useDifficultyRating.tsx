import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface DifficultyRatingState {
  isModalOpen: boolean;
  topicId: string | null;
  topicName: string | null;
  subjectId: string | null;
  subjectName: string | null;
}

export const useDifficultyRating = () => {
  const { updateTopic } = useApp();
  const [ratingState, setRatingState] = useState<DifficultyRatingState>({
    isModalOpen: false,
    topicId: null,
    topicName: null,
    subjectId: null,
    subjectName: null,
  });

  const showDifficultyModal = useCallback((
    topicId: string,
    topicName: string,
    subjectId: string,
    subjectName: string
  ) => {
    setRatingState({
      isModalOpen: true,
      topicId,
      topicName,
      subjectId,
      subjectName,
    });
  }, []);

  const closeDifficultyModal = useCallback(() => {
    setRatingState({
      isModalOpen: false,
      topicId: null,
      topicName: null,
      subjectId: null,
      subjectName: null,
    });
  }, []);

  const submitDifficultyRating = useCallback(async (difficulty: number | null) => {
    if (!ratingState.topicId || !ratingState.subjectId) return;

    try {
      await updateTopic(ratingState.subjectId, ratingState.topicId, {
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
        
        toast.success(`Dificuldade marcada como: ${difficultyLabels[difficulty as keyof typeof difficultyLabels]} ⭐`.repeat(difficulty));
      } else {
        toast.info('Avaliação de dificuldade pulada');
      }
    } catch (error) {
      console.error('Erro ao salvar dificuldade:', error);
      toast.error('Erro ao salvar avaliação de dificuldade');
    }
  }, [ratingState, updateTopic]);

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
        toast.success(`Dificuldade atualizada para ${difficulty} estrela${difficulty > 1 ? 's' : ''}!`);
      } else {
        toast.info('Avaliação de dificuldade removida');
      }
    } catch (error) {
      console.error('Erro ao atualizar dificuldade:', error);
      toast.error('Erro ao atualizar dificuldade');
    }
  }, [updateTopic]);

  return {
    ratingState,
    showDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating,
    updateTopicDifficulty,
  };
};